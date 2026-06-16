// =============================================================================
// config.js — single source of truth for the Supabase project connection
// =============================================================================
// Every Supabase URL, key, and derived base used by the frontend comes from
// HERE, driven by build-time environment variables. This lets ONE codebase
// serve multiple Supabase projects (e.g. production vs. a spin-off/test site)
// purely by setting different env vars on each Render service — no code forks,
// no hardcoded project refs.
//
// REQUIRED build-time env vars (Vite ONLY exposes vars prefixed with VITE_):
//   VITE_SUPABASE_URL       e.g. https://abcdxyz.supabase.co   (no trailing slash)
//   VITE_SUPABASE_ANON_KEY  the project's public anon key
//
// Set these in each Render static-site service's Environment settings, then
// trigger a deploy. Vite inlines them at BUILD time, so changing them requires
// a rebuild — they are NOT read at runtime in the browser.
//
// Local dev: put the same two vars in a gitignored .env.local at the repo root.
// =============================================================================

// Strip any trailing slash so `${SUPABASE_URL}/functions/v1` never doubles up.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');

// Public anon key — required by the Supabase gateway on every request.
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail LOUDLY but don't hard-crash the page. A misconfigured deploy will have
  // visibly broken API calls plus this console error — obvious during testing,
  // without white-screening live customers over a missing env var.
  // eslint-disable-next-line no-console
  console.error(
    '[config] Missing Supabase env vars. Set VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY on this Render service (and in .env.local for ' +
    'local dev), then redeploy. API calls will fail until this is fixed.'
  );
}

export { SUPABASE_URL };

// Derived bases — import these instead of hardcoding URLs anywhere.
export const API_BASE  = `${SUPABASE_URL}/functions/v1`;
export const REST_BASE = `${SUPABASE_URL}/rest/v1`;
