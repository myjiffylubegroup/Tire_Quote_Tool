// =============================================================================
// apiClient.js — staff-auth-aware fetch wrapper
// =============================================================================
// Wraps fetch() to inject the staff JWT for protected endpoints, and handles
// 401 responses by clearing the session and forcing re-PIN.
//
// USAGE:
//
//   import { apiCall } from './apiClient'
//
//   // Old (called a now-protected endpoint):
//   //   const res = await fetch(`${API_BASE}/customer-lookup?plate=...`)
//   // New:
//   const res = await apiCall(`${API_BASE}/customer-lookup?plate=...`)
//
//   // POST works the same:
//   const res = await apiCall(`${API_BASE}/generate-quote`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ ... })
//   })
//
// STORAGE KEYS:
//   localStorage.jl_staff_auth        — existing (employee info, store_id, etc.)
//                                        UNCHANGED — components that read it keep working.
//   localStorage.jl_staff_token       — NEW (the signed JWT, ~200-500 chars)
//   localStorage.jl_staff_token_expires — NEW (ISO timestamp for client-side
//                                                expiry pre-check)
//
// MIGRATION:
//   On deploy, every CSA's existing jl_staff_auth is missing the token. The
//   apiClient detects this and forces a re-PIN. After re-PIN, both keys are
//   populated and everything works normally.
// =============================================================================

const TOKEN_KEY   = 'jl_staff_token'
const EXPIRES_KEY = 'jl_staff_token_expires'

// Supabase project anon key — public, safe to expose. The gateway requires
// Authorization: Bearer <anon-key> on every request before our function code
// runs. The staff JWT goes in X-Staff-Token because Authorization is taken.
import { SUPABASE_ANON_KEY } from './config';

/**
 * Read the current staff JWT, or null if missing/expired.
 * Performs a client-side expiry pre-check to avoid sending a doomed request.
 */
export function getStaffToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  const expiresAt = localStorage.getItem(EXPIRES_KEY)
  if (expiresAt) {
    const exp = new Date(expiresAt).getTime()
    if (isNaN(exp)) return null
    // 30-second buffer — treat as expired if within 30s of real expiry
    if (Date.now() > exp - 30000) {
      return null
    }
  }

  return token
}

/**
 * Store the JWT and its expiry. Called by StaffLoginForm after PIN success.
 */
export function setStaffToken(token, expires_at) {
  if (!token) return
  localStorage.setItem(TOKEN_KEY, token)
  if (expires_at) {
    localStorage.setItem(EXPIRES_KEY, expires_at)
  }
}

/**
 * Clear the JWT and expiry only (does NOT touch jl_staff_auth — that's
 * managed by StaffPinGate.staffLogout).
 */
export function clearStaffToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}

/**
 * Force a re-PIN by clearing both staff auth and the token, then reloading.
 * StaffPinGate detects missing auth on next render and shows the PIN form.
 */
function forceReAuth() {
  clearStaffToken()
  // Also clear the legacy auth state — StaffPinGate will see it's gone
  // and prompt for re-PIN.
  localStorage.removeItem('jl_staff_auth')
  // Reload preserves the current hash route (e.g., #/quotes), so after PIN
  // the user lands back where they were.
  window.location.reload()
}

/**
 * Authenticated fetch — sends:
 *   - Authorization: Bearer <anon-key>  (required by Supabase gateway)
 *   - X-Staff-Token: <staff-jwt>        (read by our requireStaffAuth helper)
 *
 * Both are required for protected endpoints. On 401 with auth_error, forces re-PIN.
 *
 * Returns the Response object (not the parsed body) — same contract as fetch().
 */
export async function apiCall(url, options = {}) {
  const token = getStaffToken()

  if (!token) {
    forceReAuth()
    throw new Error('No staff session — re-authenticating')
  }

  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'X-Staff-Token': token,
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    // Try to read the auth_error reason from the response body
    let authError = null
    try {
      const cloned = res.clone()
      const body = await cloned.json()
      authError = body?.auth_error
    } catch {
      // body wasn't JSON or already consumed — fine
    }

    if (authError === 'expired' || authError === 'missing' ||
        authError === 'invalid' || authError === 'malformed') {
      forceReAuth()
      throw new Error(`Staff session ${authError} — re-authenticating`)
    }
    // Other 401s — let the caller handle them
  }

  return res
}

/**
 * Unauthenticated fetch — for public endpoints. Sends only the gateway auth
 * (Authorization: Bearer <anon-key>) — no staff JWT.
 *
 * Use for: get-quote?code=..., get-mechanical-quote?short_code=...,
 *   vehicle-*, vcdb-vehicle-*, tire-inventory-*, store-inventory,
 *   ewt-labor-search, vehicle-lookup, verify-staff-pin.
 */
export async function apiCallPublic(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  }
  return fetch(url, { ...options, headers })
}

/**
 * Whether the user currently has a valid (non-expired) staff JWT.
 */
export function isStaffAuthenticated() {
  return getStaffToken() !== null
}
