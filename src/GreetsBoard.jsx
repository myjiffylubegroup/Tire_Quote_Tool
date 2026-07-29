// =============================================================================
// GreetsBoard.jsx — unattended back-counter "now arriving" wall display
// =============================================================================
// A full-bleed, light, TV-optimized board that shows TODAY's most recent greets
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
// STAFF-ONLY SURFACE: mounted at the back counter, not customer-facing, so GROW
// codes, estimated subtotal, oil tier, and Engine Prep callouts are fair game.
//
// THEME: light board for TV legibility. All colors live in the C palette below
// so the look can be tuned in one place.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiCallPublic } from './apiClient';
import { oilTierLabel } from './concernLabels';

import { API_BASE } from './config';

// Poll cadence. 30s keeps the board feeling live without hammering the function.
const POLL_MS = 30000;
// Header clock + time-ago labels tick on this interval.
const CLOCK_MS = 1000;
// Default number of tiles shown (most recent N). Overridable via ?max=.
const DEFAULT_MAX_TILES = 7;

// ---- Palette (light) --------------------------------------------------------
const C = {
  pageBg: '#eef1f5',
  cardBg: '#ffffff',
  cardBorder: '#e4e8ee',
  cardShadow: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textFaint: '#64748b',
  accent: '#7c3aed',          // purple — Greets identity
  railNeutral: '#cbd5e1',
  railExpress: '#dc2626',
  railFull: '#16a34a',
  divider: '#e2e8f0',
  prepBg: '#facc15',
  prepText: '#451a03',
};

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

// Engine-prep detection. This drives a physical "pour BEFORE pull-in" banner,
// so it must NEVER go dark. Prefer the kiosk's tm_engine_prep_free flag, but
// greets-display is a redacted feed and may not carry it — so fall back to the
// FULL set of free-EP package GROW codes (all Welcome-EP packages, including
// the TM16–20 retention-recapture codes). Either path catches every free EP.
const ENGINE_PREP_GROW_CODES = [
  'GREETTM3', 'GREETTM8', 'GREETTM13', 'GREETTM14', 'GREETTM15',
  'GREETTM16', 'GREETTM17', 'GREETTM18', 'GREETTM19', 'GREETTM20',
];

// ---- Service product images -------------------------------------------------
// Bottles are static assets served from the render site at /images. If they
// actually resolve at a different URL, change IMG_BASE only.
const IMG_BASE = '/images';

// oil_tier_selected -> bottle filename. The label under each bottle comes from
// oilTierLabel() so it matches the staff tool exactly.
//   NOTE: performance_synthetic and diesel_lightduty were assigned by
//   elimination (the only gasoline / diesel files left). Confirm if either
//   looks wrong on the board.
const OIL_IMAGE_FILE = {
  blend:                 'pennzoil-gold-blend.jpg',
  synthetic:             'pennzoil-platinum-synthetic.jpg',
  european:              'pennzoil-platinum-euro.jpg',
  performance_synthetic: 'pennzoil-ultra-platinum-0w40.jpg',
  diesel_conventional:   'rotella-t4-diesel-conventional.jpg',
  diesel_synthetic:      'rotella-t6-diesel-synthetic.jpg',
  diesel_lightduty:      'castrol-edge-dexosd-0w20.jpg',
};

// Clean bottle captions. oilTierLabel() already covers the gasoline tiers with
// the Pennzoil product names shown in the staff tool; the diesel tiers aren't
// in oilTierLabel, so caption those here to avoid raw codes ("diesel_synthetic")
// showing on the board.
const OIL_LABEL_OVERRIDE = {
  diesel_conventional: 'Diesel Conventional',
  diesel_synthetic:    'Diesel Synthetic',
  diesel_lightduty:    'Diesel Light-Duty',
};

// Throttle Muscle products: code -> { file, label }. Engine Prep (TM2745) is
// intentionally NOT here — it lives in the banner only, per spec.
const TM_PRODUCTS = {
  TM3554:  { file: 'tm3554-engine-armor.png',    label: 'Engine Armor' },
  TM5853A: { file: 'tm5853a-fuel-treatment.png', label: 'Fuel Treatment' },
  TM3333:  { file: 'tm3333-high-mileage.png',    label: 'High Mileage' },
  TM9259:  { file: 'tm9259-fuel-cleaner.png',    label: 'Fuel Cleaner' },
  TM5555:  { file: 'tm5555-synfog.png',          label: 'SynFog' },
};

// tm_package_selected -> ordered list of TM product codes (gasoline).
const TM_PACKAGE_PRODUCTS = {
  max_protect:  ['TM3554', 'TM5853A'],
  high_mileage: ['TM3333', 'TM9259'],
  vip:          ['TM3554', 'TM5555'],
};

// Diesel overrides (applied when the oil tier is a diesel tier). Any package
// not listed here falls back to the gasoline list above (e.g. VIP).
//   max_protect (diesel)  -> two bottles of Engine Armor (TM3554)
//   high_mileage (diesel) -> High Mileage only (TM3333). ASSUMPTION: a single
//                            bottle, per the spec wording. If diesel high
//                            mileage should be two like Max Protect, make this
//                            ['TM3333', 'TM3333'].
const TM_PACKAGE_PRODUCTS_DIESEL = {
  max_protect:  ['TM3554', 'TM3554'],
  high_mileage: ['TM3333'],
};

const DIESEL_OIL_TIERS = ['diesel_conventional', 'diesel_synthetic', 'diesel_lightduty'];

// -----------------------------------------------------------------------------
// Small pure helpers
// -----------------------------------------------------------------------------

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

function pacificClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
  });
}

function pacificTimeOf(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
  });
}

function displayName(greet) {
  const first = titleCase(greet.customer_first_name || '').trim();
  const initial = (greet.customer_last_initial || '').trim();
  if (first && initial) return `${first} ${initial}.`;
  if (first) return first;
  return 'Customer';
}

function hasEnginePrep(greet) {
  if (greet?.tm_engine_prep_free === true) return true;
  const codes = greet && greet.grow_codes;
  if (!Array.isArray(codes) || codes.length === 0) return false;
  return codes.some((c) => ENGINE_PREP_GROW_CODES.includes(c));
}

// Contact-change alerts — same rules as QuoteLookup's contactAlerts(): fire on
// verified_new always, and on captured_unverified only for a returning customer.
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

// Classification → rail color + chip styling (light). null for unknown
// ("other") → neutral gray rail and no classification chip.
function classificationMeta(code) {
  if (code === 'express') {
    return {
      label: 'EXPRESS', icon: '⚡', rail: C.railExpress,
      chipBg: '#fee2e2', chipText: '#b91c1c', chipBorder: '#fecaca',
    };
  }
  if (code === 'full') {
    return {
      label: 'FULL', icon: '🔧', rail: C.railFull,
      chipBg: '#dcfce7', chipText: '#15803d', chipBorder: '#bbf7d0',
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

function isDieselTier(tier) {
  return typeof tier === 'string' && (DIESEL_OIL_TIERS.includes(tier) || tier.startsWith('diesel'));
}

// Ordered list of product bottles for a greet's service: the oil bottle (from
// oil tier) followed by the TM package bottles (diesel override applied).
// Returns [{ file, label }, ...]; empty when there's no oil and no TM package
// (e.g. smog-only visits). Engine Prep is not included — it's the banner.
function serviceProducts(greet) {
  const out = [];
  const tier = greet.oil_tier_selected;
  if (tier && OIL_IMAGE_FILE[tier]) {
    out.push({ file: OIL_IMAGE_FILE[tier], label: OIL_LABEL_OVERRIDE[tier] || oilTierLabel(tier) || 'Oil' });
  }
  const pkg = greet.tm_package_selected;
  if (pkg) {
    const codes = (isDieselTier(tier) && TM_PACKAGE_PRODUCTS_DIESEL[pkg]) || TM_PACKAGE_PRODUCTS[pkg] || [];
    codes.forEach((code) => {
      const p = TM_PRODUCTS[code];
      if (p) out.push({ file: p.file, label: p.label });
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Reusable chip
// -----------------------------------------------------------------------------
function Chip({ children, bg, text, border, bold }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      fontSize: '16px', fontWeight: bold ? 800 : 600, letterSpacing: '0.3px',
      color: text, backgroundColor: bg, border: `1.5px solid ${border}`,
      padding: '4px 12px', borderRadius: '10px', whiteSpace: 'nowrap',
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
  const rail = cls ? cls.rail : C.railNeutral;
  const prep = hasEnginePrep(greet);
  const alerts = contactAlerts(greet);
  const wait = waitPreferenceChip(greet.wait_preference);
  const products = serviceProducts(greet);

  const ageMin = Math.floor((now - new Date(greet.created_at).getTime()) / 60000);
  const isNew = ageMin < 3;

  return (
    <div style={{
      display: 'flex',
      backgroundColor: C.cardBg,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: isNew ? `0 0 0 3px ${rail}33, ${C.cardShadow}` : C.cardShadow,
    }}>
      {/* Classification rail */}
      <div style={{ width: '8px', backgroundColor: rail, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Engine Prep takeover banner */}
        {prep && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            backgroundColor: C.prepBg, color: C.prepText, padding: '10px 20px',
          }}>
            <img
              src="/images/engine_prep_bottle_64.png"
              srcSet="/images/engine_prep_bottle_64.png 1x, /images/engine_prep_bottle_128.png 2x"
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
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {/* Left: all text (name, vehicle, chips) */}
          <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: code + name + pills + arrival time (all left-aligned) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: '17px', fontWeight: 700, color: C.accent, letterSpacing: '1px' }}>
              #{greet.short_code}
            </span>
            {greet.status === 'in_progress' && (
              <span style={{
                fontSize: '13px', fontWeight: 800, letterSpacing: '0.8px',
                color: '#1e40af', backgroundColor: '#dbeafe',
                border: '1.5px solid #60a5fa', borderRadius: '999px', padding: '2px 10px',
              }}>
                ● IN PROGRESS
              </span>
            )}
            <span style={{ fontSize: '28px', fontWeight: 800, color: C.textPrimary, lineHeight: 1.1 }}>
              {displayName(greet)}
            </span>
            {isNew && (
              <span style={{
                fontSize: '13px', fontWeight: 800, letterSpacing: '0.8px',
                color: '#15803d', backgroundColor: '#dcfce7',
                border: '1.5px solid #86efac', borderRadius: '999px', padding: '2px 10px',
              }}>
                NEW
              </span>
            )}
            {greet.language === 'es' && (
              <Chip bg="#dbeafe" text="#1d4ed8" border="#bfdbfe">🇲🇽 ES</Chip>
            )}
            {greet.is_returning_vehicle && (
              <Chip bg="#dcfce7" text="#15803d" border="#bbf7d0">RETURNING</Chip>
            )}
            {greet.is_fleet_vehicle && (
              <Chip bg="#dbeafe" text="#1d4ed8" border="#bfdbfe">FLEET</Chip>
            )}
            <span style={{ fontSize: '16px', color: C.textSecondary, whiteSpace: 'nowrap' }}>
              · {pacificTimeOf(greet.created_at)} · {timeAgo(greet.created_at, now)}
            </span>
          </div>

          {/* Vehicle line */}
          <div style={{ fontSize: '19px', color: C.textSecondary, marginTop: '6px' }}>
            {titleCase(greet.vehicle_display) || 'Vehicle unknown'}
            {greet.vehicle_mileage != null && (
              <span style={{ color: C.textFaint }}> · {Number(greet.vehicle_mileage).toLocaleString()} mi</span>
            )}
          </div>

          {/* Chips row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
            {cls && (
              <Chip bg={cls.chipBg} text={cls.chipText} border={cls.chipBorder} bold>
                {cls.icon} {cls.label}
              </Chip>
            )}
            {wait && (
              <Chip bg="#f1f5f9" text="#475569" border="#e2e8f0">
                {wait.icon} {wait.label}
              </Chip>
            )}

            {!greet.oil_tier_selected && (
              <Chip bg="#f8fafc" text="#334155" border="#e2e8f0">No oil service</Chip>
            )}

            {greet.oil_tier_needs_confirmation && (
              <Chip bg="#fef3c7" text="#b45309" border="#fde68a" bold>⚠ CONFIRM OIL</Chip>
            )}

            {alerts.map((a) => (
              <Chip key={a} bg="#fef3c7" text="#b45309" border="#fde68a" bold>⚠ {a.toUpperCase()}</Chip>
            ))}

            {Array.isArray(greet.grow_codes) && greet.grow_codes.map((code, i) => (
              <span key={`${code}-${i}`} style={{
                fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
                fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px',
                color: '#4338ca', backgroundColor: '#eef2ff',
                border: '1.5px solid #c7d2fe', padding: '4px 10px', borderRadius: '8px',
              }}>
                {code}
              </span>
            ))}
          </div>
          </div>{/* end left text column */}

          {/* Service product bottles — inline on the right so they use the
              widescreen width instead of adding card height. Oil tier +
              Throttle Muscle package; Engine Prep stays in the banner above.
              Hidden when there's no oil and no TM package. A bottle whose image
              fails to load hides itself, leaving its text label as fallback. */}
          {products.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexShrink: 0 }}>
              {products.map((p, i) => (
                <div key={`${p.file}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '64px' }}>
                  <img
                    src={`${IMG_BASE}/${p.file}`}
                    alt={p.label}
                    style={{ height: '54px', width: 'auto', maxWidth: '64px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: C.textFaint, textAlign: 'center', lineHeight: 1.15 }}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>{/* end outer flex row */}
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
        setErrorMsg(data.error || `Request failed (${res.status})`);
        setStatus(hasDataRef.current ? 'stale' : 'error');
      }
    } catch (e) {
      setErrorMsg('Cannot reach server');
      setStatus(hasDataRef.current ? 'stale' : 'error');
    }
  }, [configValid, key, storeId]);

  useEffect(() => {
    if (!configValid) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [configValid, load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);

  const page = {
    minHeight: '100vh',
    backgroundColor: C.pageBg,
    color: C.textPrimary,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '24px 28px 32px',
    boxSizing: 'border-box',
  };

  if (!configValid) {
    return (
      <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '640px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '14px' }}>Greets Board — setup needed</div>
          <div style={{ fontSize: '19px', color: C.textSecondary, lineHeight: 1.6 }}>
            This screen needs a store and a display key in its URL. Point the device at:
          </div>
          <div style={{
            marginTop: '18px', fontFamily: 'monospace', fontSize: '17px', color: '#4338ca',
            backgroundColor: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: '12px',
            padding: '16px 18px', wordBreak: 'break-all',
          }}>
            tires.myjiffylube.ai/#/board?store=609&amp;key=YOUR_DISPLAY_KEY
          </div>
        </div>
      </div>
    );
  }

  const statusDot = status === 'live' ? '#16a34a' : status === 'loading' ? '#ca8a04' : '#dc2626';
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
        borderBottom: `1px solid ${C.divider}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '30px', fontWeight: 800, color: C.textPrimary }}>{storeName}</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: C.accent, letterSpacing: '0.5px' }}>
            👋 GREETS · NOW ARRIVING
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: C.textSecondary }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: statusDot, display: 'inline-block' }} />
            {statusText}
            {lastUpdated && status !== 'loading' && (
              <span style={{ color: C.textFaint }}>· updated {timeAgo(new Date(lastUpdated).toISOString(), now) || 'just now'}</span>
            )}
          </span>
          <span style={{ fontSize: '18px', color: C.textSecondary }}>
            <strong style={{ color: C.textPrimary }}>{greets.length}</strong> today
          </span>
          <span style={{ fontSize: '30px', fontWeight: 800, color: C.textPrimary }}>{pacificClock(now)}</span>
        </div>
      </div>

      {status === 'error' && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '18px',
          fontSize: '18px', color: '#b91c1c', fontWeight: 600,
        }}>
          {errorMsg === 'Unauthorized'
            ? 'Display key rejected — check the key in this screen’s URL.'
            : `Couldn’t load greets: ${errorMsg}`}
        </div>
      )}

      {greets.length === 0 && status === 'live' ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textFaint, fontSize: '24px', fontWeight: 600 }}>
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
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '16px', color: C.textFaint }}>
          + {overflow} more earlier today
        </div>
      )}
    </div>
  );
}
