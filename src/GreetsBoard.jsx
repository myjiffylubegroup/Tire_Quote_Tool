// =============================================================================
// GreetsBoard.jsx — unattended back-counter "now arriving" wall display
// =============================================================================
// A full-bleed, dark, TV-optimized board that shows TODAY's most recent greets
// at a single store, newest first. Built for ScreenCloud (or any device that
// loads a URL): no login, no interaction, auto-refreshing.
//
// URL: tires.myjiffylube.ai/#/board?store=609&key=<GREETS_DISPLAY_KEY>
//   store  (required) — store id (609, 1002, ...)
//   key    (required) — the display key (matches GREETS_DISPLAY_KEY in Vault)
//   max    (optional) — how many tiles to show (default 7, clamped 1..12)
//
// Data comes from the public, redacted `greets-display` Edge Function via
// apiCallPublic (gateway anon key only) plus the X-Display-Key header. No PII
// is ever in the payload — names arrive as first name + last initial.
//
// STAFF-ONLY SURFACE: this is mounted at the back counter, not customer-facing,
// so GROW codes, estimated subtotal, oil tier, and Engine Prep callouts are all
// fair game to show.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiCallPublic } from './apiClient';
import { oilTierLabel, tmPackageLabel } from './concernLabels';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';

// Poll cadence. 30s keeps the board feeling live without hammering the function.
const POLL_MS = 30000;
// Header clock + time-ago labels tick on this interval.
const CLOCK_MS = 1000;
// Default number of tiles shown (most recent N). Overridable via ?max=.
const DEFAULT_MAX_TILES = 7;

// Store id → display name (header). Mirrors the STORES list in QuoteLookup.
const STORE_NAMES = {
  609: 'Santa Maria',
  1002: 'San Luis Obispo',
  1257: 'Goleta',
  1270: 'Arroyo Grande',
  1396: 'Santa Barbara — Downtown',
  1932: 'Atascadero',
  2911: 'Paso Robles',
  4182: 'Santa Barbara — State Street',
};

// Engine-prep GROW codes — kept in sync with QuoteLookup.jsx. If the kiosk
// project changes these, update both places. Presence of any of these means
// the Throttle Muscle Engine Prep is poured BEFORE the car pulls in (3-min
// pre-treat), so the CSA needs to grab the bottle ahead of time — hence the
// loud banner.
const ENGINE_PREP_GROW_CODES = ['GREETTM3', 'GREETTM8', 'GREETTM13', 'GREETTM14', 'GREETTM15'];

// -----------------------------------------------------------------------------
// Small pure helpers
// -----------------------------------------------------------------------------

// Read params out of the hash query string (#/board?store=609&key=...).
function getHashParams() {
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  const qs = qIndex >= 0 ? hash.slice(qIndex + 1) : '';
  return new URLSearchParams(qs);
}

// Title-case shouty Turbo strings: "PAUL" -> "Paul",
// "FORD TRUCKS F150 PICKUP" -> "Ford Trucks F150 Pickup". Leaves digits alone.
function titleCase(s) {
  if (!s || typeof s !== 'string') return s || '';
  return s.toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);

// "just now" / "3 min ago" / "2 hrs ago", computed against a passed-in `now`
// so all tiles share one clock tick.
function timeAgo(iso, now) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const hr = Math.floor(diffMin / 60);
  return `${hr} hr${hr !== 1 ? 's' : ''} ago`;
}

// Pacific clock time, e.g. "3:14 PM". Forced to LA regardless of the device's
// own timezone so the board always reads in store-local time.
function pacificClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function pacificTimeOf(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Build "Paul K." from the redacted fields. Falls back gracefully.
function displayName(greet) {
  const first = titleCase(greet.customer_first_name || '').trim();
  const initial = (greet.customer_last_initial || '').trim();
  if (first && initial) return `${first} ${initial}.`;
  if (first) return first;
  return 'Customer';
}

function hasEnginePrep(greet) {
  const codes = greet && greet.grow_codes;
  if (!Array.isArray(codes) || codes.length === 0) return false;
  return codes.some((c) => ENGINE_PREP_GROW_CODES.includes(c));
}

// Contact-change alerts from field_verification — same rules as QuoteLookup's
// contactAlerts(): fire on verified_new always, and on captured_unverified only
// for a returning customer (new customers type everything fresh, so unverified
// is normal noise for them).
function contactAlerts(greet) {
  const fv = greet && greet.field_verification;
  if (!fv || typeof fv !== 'object') return [];
  const returning = greet.is_returning_vehicle === true;
  const fires = (status) =>
    status === 'verified_new' || (status === 'captured_unverified' && returning);

  const defs = [
    { key: 'phone', label: 'New phone' },
    { key: 'email', label: 'New email' },
    { key: 'first_name', label: 'Name unverified' },
  ];
  const out = [];
  for (const d of defs) {
    if (fires(fv[d.key])) out.push(d.label);
  }
  return out;
}

// Classification → rail color + chip styling. null for unknown ("other"), in
// which case the tile uses a neutral gray rail and shows no classification chip.
function classificationMeta(code) {
  if (code === 'express') {
    return {
      label: 'EXPRESS', icon: '⚡',
      rail: '#ef4444',
      chipBg: 'rgba(239,68,68,0.16)', chipText: '#fca5a5', chipBorder: 'rgba(239,68,68,0.45)',
    };
  }
  if (code === 'full') {
    return {
      label: 'FULL', icon: '🔧',
      rail: '#22c55e',
      chipBg: 'rgba(34,197,94,0.16)', chipText: '#86efac', chipBorder: 'rgba(34,197,94,0.45)',
    };
  }
  return null;
}

function waitPreferenceChip(code) {
  if (code === 'lobby') return { icon: '🪑', label: 'Lobby' };
  if (code === 'in_car') return { icon: '🚗', label: 'In car' };
  if (code === 'drop_off') return { icon: '🔑', label: 'Drop off' };
  return null;
}

// -----------------------------------------------------------------------------
// Reusable chip
// -----------------------------------------------------------------------------
function Chip({ children, bg, text, border, bold }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '16px',
      fontWeight: bold ? 800 : 600,
      letterSpacing: '0.3px',
      color: text,
      backgroundColor: bg,
      border: `1.5px solid ${border}`,
      padding: '4px 12px',
      borderRadius: '10px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// GreetTile — one greet on the board
// -----------------------------------------------------------------------------
function GreetTile({ greet, now }) {
  const cls = classificationMeta(greet.service_classification);
  const rail = cls ? cls.rail : '#475569';
  const prep = hasEnginePrep(greet);
  const alerts = contactAlerts(greet);
  const wait = waitPreferenceChip(greet.wait_preference);

  const ageMin = Math.floor((now - new Date(greet.created_at).getTime()) / 60000);
  const isNew = ageMin < 3;

  const oil = oilTierLabel(greet.oil_tier_selected);
  const tm = greet.tm_package_selected ? tmPackageLabel(greet.tm_package_selected) : null;

  return (
    <div style={{
      display: 'flex',
      backgroundColor: '#161c26',
      border: '1px solid #232b38',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: isNew ? `0 0 0 2px ${rail}66` : 'none',
    }}>
      {/* Classification rail */}
      <div style={{ width: '8px', backgroundColor: rail, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Engine Prep takeover banner */}
        {prep && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: '#facc15',
            color: '#111827',
            padding: '10px 20px',
          }}>
            <img
              src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/engine_prep_bottle_64.png"
              srcSet="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/engine_prep_bottle_64.png 1x, https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/engine_prep_bottle_128.png 2x"
              alt=""
              style={{ height: '40px', width: 'auto', flexShrink: 0 }}
            />
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.4px' }}>
              ENGINE PREP — POUR BEFORE PULL-IN
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '15px', fontWeight: 800, letterSpacing: '0.6px' }}>
              ⏱ 3-MIN PRE-TREAT
            </span>
          </div>
        )}

        <div style={{ padding: '16px 20px' }}>
          {/* Top row: name + pills .... time + price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#a78bfa', letterSpacing: '1px' }}>
                #{greet.short_code}
              </span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>
                {displayName(greet)}
              </span>
              {isNew && (
                <span style={{
                  fontSize: '13px', fontWeight: 800, letterSpacing: '0.8px',
                  color: '#bbf7d0', backgroundColor: 'rgba(34,197,94,0.18)',
                  border: '1.5px solid rgba(34,197,94,0.5)', borderRadius: '999px', padding: '2px 10px',
                }}>
                  NEW
                </span>
              )}
              {greet.language === 'es' && (
                <Chip bg="rgba(59,130,246,0.16)" text="#93c5fd" border="rgba(59,130,246,0.45)">🇲🇽 ES</Chip>
              )}
              {greet.is_returning_vehicle && (
                <Chip bg="rgba(34,197,94,0.14)" text="#86efac" border="rgba(34,197,94,0.4)">RETURNING</Chip>
              )}
              {greet.is_fleet_vehicle && (
                <Chip bg="rgba(59,130,246,0.14)" text="#93c5fd" border="rgba(59,130,246,0.4)">FLEET</Chip>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '16px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {pacificTimeOf(greet.created_at)} · {timeAgo(greet.created_at, now)}
              </div>
              {greet.estimated_subtotal != null && (
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>
                  {formatCurrency(greet.estimated_subtotal)}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle line */}
          <div style={{ fontSize: '19px', color: '#cbd5e1', marginTop: '6px' }}>
            {titleCase(greet.vehicle_display) || 'Vehicle unknown'}
            {greet.vehicle_mileage != null && (
              <span style={{ color: '#64748b' }}> · {Number(greet.vehicle_mileage).toLocaleString()} mi</span>
            )}
          </div>

          {/* Chips row: classification, wait, service summary, flags, alerts, codes */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
            {cls && (
              <Chip bg={cls.chipBg} text={cls.chipText} border={cls.chipBorder} bold>
                {cls.icon} {cls.label}
              </Chip>
            )}
            {wait && (
              <Chip bg="rgba(148,163,184,0.12)" text="#cbd5e1" border="rgba(148,163,184,0.35)">
                {wait.icon} {wait.label}
              </Chip>
            )}

            <Chip bg="rgba(148,163,184,0.08)" text="#e2e8f0" border="rgba(148,163,184,0.25)">
              {oil || 'No oil service'}{tm ? ` + ${tm}` : ''}
            </Chip>

            {greet.oil_tier_needs_confirmation && (
              <Chip bg="rgba(245,158,11,0.16)" text="#fcd34d" border="rgba(245,158,11,0.5)" bold>
                ⚠ CONFIRM OIL
              </Chip>
            )}

            {alerts.map((a) => (
              <Chip key={a} bg="rgba(245,158,11,0.16)" text="#fcd34d" border="rgba(245,158,11,0.5)" bold>
                ⚠ {a.toUpperCase()}
              </Chip>
            ))}

            {Array.isArray(greet.grow_codes) && greet.grow_codes.map((code, i) => (
              <span key={`${code}-${i}`} style={{
                fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                color: '#c7d2fe',
                backgroundColor: 'rgba(99,102,241,0.16)',
                border: '1.5px solid rgba(99,102,241,0.4)',
                padding: '4px 10px',
                borderRadius: '8px',
              }}>
                {code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// GreetsBoard — top-level
// -----------------------------------------------------------------------------
export default function GreetsBoard() {
  const params = getHashParams();
  const storeParam = params.get('store');
  const key = params.get('key');
  const maxParam = parseInt(params.get('max'), 10);
  const maxTiles = Number.isInteger(maxParam) ? Math.min(Math.max(maxParam, 1), 12) : DEFAULT_MAX_TILES;

  const storeId = Number(storeParam);
  const storeName = STORE_NAMES[storeId] || (storeId ? `Store #${storeId}` : '');

  const configValid = Number.isInteger(storeId) && storeId > 0 && Boolean(key);

  const [greets, setGreets] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | live | stale | error
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Keep the latest good data when a refresh fails, so the board never blanks
  // on a transient network blip — it just goes "stale" until the next success.
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!configValid) return;
    try {
      const res = await apiCallPublic(`${API_BASE}/greets-display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Display-Key': key },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGreets(Array.isArray(data.greets) ? data.greets : []);
        setStatus('live');
        setLastUpdated(Date.now());
        hasDataRef.current = true;
        setErrorMsg('');
      } else {
        // Bad key (401) or other server error.
        setErrorMsg(data.error || `Request failed (${res.status})`);
        setStatus(hasDataRef.current ? 'stale' : 'error');
      }
    } catch (e) {
      setErrorMsg('Cannot reach server');
      setStatus(hasDataRef.current ? 'stale' : 'error');
    }
  }, [configValid, key, storeId]);

  // Initial load + polling.
  useEffect(() => {
    if (!configValid) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [configValid, load]);

  // Clock tick (header time + time-ago freshness).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);

  const page = {
    minHeight: '100vh',
    backgroundColor: '#0b0f14',
    color: '#f1f5f9',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '24px 28px 32px',
    boxSizing: 'border-box',
  };

  // --- Config error (missing/invalid store or key) -------------------------
  if (!configValid) {
    return (
      <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '640px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '14px' }}>Greets Board — setup needed</div>
          <div style={{ fontSize: '19px', color: '#94a3b8', lineHeight: 1.6 }}>
            This screen needs a store and a display key in its URL. Point the device at:
          </div>
          <div style={{
            marginTop: '18px', fontFamily: 'monospace', fontSize: '17px', color: '#c7d2fe',
            backgroundColor: '#161c26', border: '1px solid #232b38', borderRadius: '12px', padding: '16px 18px',
            wordBreak: 'break-all',
          }}>
            tires.myjiffylube.ai/#/board?store=609&amp;key=YOUR_DISPLAY_KEY
          </div>
        </div>
      </div>
    );
  }

  const statusDot = status === 'live' ? '#22c55e' : status === 'loading' ? '#eab308' : '#ef4444';
  const statusText =
    status === 'live' ? 'Live'
      : status === 'loading' ? 'Connecting…'
        : status === 'stale' ? 'Reconnecting…'
          : 'Connection error';

  const visible = greets.slice(0, maxTiles);
  const overflow = greets.length - visible.length;

  return (
    <div style={page}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap',
        paddingBottom: '16px', marginBottom: '18px',
        borderBottom: '1px solid #232b38',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '30px', fontWeight: 800, color: '#f1f5f9' }}>{storeName}</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px' }}>
            👋 GREETS · NOW ARRIVING
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#94a3b8' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: statusDot, display: 'inline-block' }} />
            {statusText}
            {lastUpdated && status !== 'loading' && (
              <span style={{ color: '#64748b' }}>· updated {timeAgo(new Date(lastUpdated).toISOString(), now) || 'just now'}</span>
            )}
          </span>
          <span style={{ fontSize: '18px', color: '#cbd5e1' }}>
            <strong style={{ color: '#f1f5f9' }}>{greets.length}</strong> today
          </span>
          <span style={{ fontSize: '30px', fontWeight: 800, color: '#f1f5f9' }}>{pacificClock(now)}</span>
        </div>
      </div>

      {/* Error overlay when we have no data at all */}
      {status === 'error' && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '18px',
          fontSize: '18px', color: '#fca5a5', fontWeight: 600,
        }}>
          {errorMsg === 'Unauthorized'
            ? 'Display key rejected — check the key in this screen’s URL.'
            : `Couldn’t load greets: ${errorMsg}`}
        </div>
      )}

      {/* Feed */}
      {greets.length === 0 && status === 'live' ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '24px', fontWeight: 600 }}>
          No greets yet today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {visible.map((g) => (
            <GreetTile key={g.greet_id} greet={g} now={now} />
          ))}
        </div>
      )}

      {overflow > 0 && (
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '16px', color: '#64748b' }}>
          + {overflow} more earlier today
        </div>
      )}
    </div>
  );
}
