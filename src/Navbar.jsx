import React, { useState, useEffect, useRef } from 'react';
import StaffLoginModal from './StaffLoginModal';

/**
 * Navbar — shared header + navigation bar used by all main pages.
 *
 * Renders:
 *   1. White header with logo (links home) + STORE selector
 *   2. Purple navigation bar with links, BUSINESS ACCOUNTS dropdown,
 *      and a Staff Login button / Staff badge
 *
 * Owns internally:
 *   - Auth state (read from localStorage.jl_staff_auth)
 *   - Login modal open/close
 *   - BUSINESS ACCOUNTS dropdown open/close (with click-outside-to-close)
 *
 * Props:
 *   currentPage    (string)   — one of: 'tirefinder', 'mechanical', 'inventory',
 *                                'quotes', 'enterprise', 'fleet', 'reports', 'builder'.
 *                                Used to highlight the active link.
 *   selectedStore  (string|number) — currently selected store id
 *   onStoreChange  (function) — called with new store id when user changes selector
 *
 * After successful login, StaffLoginModal reloads the page (default behavior),
 * which causes every component to re-read localStorage and pick up the new
 * auth state. This is intentionally simple and avoids a context refactor.
 */

const STORES = [
  { id: 609,  name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

// Single source of truth for navigation structure.
// `key` matches the `currentPage` prop. `children` makes a dropdown.
const NAV_ITEMS = [
  { key: 'tirefinder', label: 'TIRE FINDER',     href: '#/' },
  { key: 'mechanical', label: 'MECHANICAL',      href: '#/mechanical' },
  { key: 'inventory',  label: 'STORE INVENTORY', href: '#/inventory' },
  { key: 'quotes',     label: 'RETRIEVE QUOTE',  href: '#/quotes' },
  {
    key: 'business',
    label: 'BUSINESS ACCOUNTS',
    children: [
      { key: 'enterprise', label: 'ENTERPRISE RENT-A-CAR', href: '#/enterprise' },
      { key: 'fleet',      label: 'FLEET NEGOTIATED',      href: '#/fleet' },
    ],
  },
  { key: 'reports',    label: 'REPORTS',         href: '#/reports' },
];

const PURPLE = '#9b59b6';
const MAX_WIDTH = '1400px';
const STORAGE_KEY = 'jl_staff_auth';

// Image URLs (centralized so themes can pick the right logo)
const LOGO_BLACK = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png';
const LOGO_WHITE = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzwhite.png';
const LOGO_FLEETCARE = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_FleetCare_Horizontal.png';
const LOGO_ENTERPRISE = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/logo-enterprise.png';

// Theme tokens. Adding a new theme = add a new entry here.
// `arrowColorHex` is the hex (no #) used inside the SVG data URL for the
// store selector's dropdown arrow.
const THEMES = {
  default: {
    headerBg:           'white',
    headerBorder:       '1px solid #eee',
    headerLabelColor:   '#666',
    navBg:              PURPLE,
    accentColor:        PURPLE,
    arrowColorHex:      '9b59b6',
    logoSrc:            LOGO_BLACK,
    logoHeight:         '50px',
    coBrandLogoSrc:     null,
    coBrandLogoHeight:  null,
  },
  enterprise: {
    headerBg:           '#231F20',
    headerBorder:       '3px solid #009750',
    headerLabelColor:   '#ccc',
    navBg:              '#009750',
    accentColor:        '#009750',
    arrowColorHex:      '009750',
    logoSrc:            LOGO_WHITE,
    logoHeight:         '35px',
    coBrandLogoSrc:     LOGO_ENTERPRISE,
    coBrandLogoHeight:  '40px',
  },
  fleet: {
    headerBg:           '#031781',
    headerBorder:       '3px solid #2748f9',
    headerLabelColor:   '#ccc',
    navBg:              '#2748f9',
    accentColor:        '#2748f9',
    arrowColorHex:      '2748f9',
    logoSrc:            LOGO_FLEETCARE,
    logoHeight:         '45px',
    coBrandLogoSrc:     null,
    coBrandLogoHeight:  null,
  },
};

// Helper: read auth from localStorage safely
const readAuth = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Navbar({
  currentPage,
  selectedStore,
  onStoreChange,
  // When true, the store dropdown includes a "Select Store" placeholder option.
  // Used by pages where "no store selected" is a meaningful state (e.g. StoreInventory,
  // where CSAs intentionally pick which store to inspect rather than auto-loading
  // their own store's data).
  showStorePlaceholder = false,
  // Theme key — see THEMES above. 'default' is the standard purple branding.
  // 'enterprise' (black/green) and 'fleet' (dark blue/blue) are co-branded
  // workflows where the visual signal is a safety feature: a customer who
  // sees the page must immediately recognize it is NOT consumer pricing.
  theme = 'default',
}) {
  const t = THEMES[theme] || THEMES.default;

  // ── Auth state (read from localStorage; refreshed via page reload after login) ──
  const [auth, setAuth] = useState(() => readAuth());
  const isAuthenticated = !!auth;
  const staffDisplayName = auth?.display_name || auth?.first_name || '';

  // Re-read auth if another tab updates it (rare, but cheap to support)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setAuth(readAuth());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── Login modal ──
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ── BUSINESS ACCOUNTS dropdown ──
  const [businessOpen, setBusinessOpen] = useState(false);
  const businessRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!businessOpen) return;
    const onClick = (e) => {
      if (businessRef.current && !businessRef.current.contains(e.target)) {
        setBusinessOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [businessOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!businessOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setBusinessOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [businessOpen]);

  // Active state helpers
  const isItemActive = (item) => {
    if (item.children) {
      return item.children.some((c) => c.key === currentPage);
    }
    return item.key === currentPage;
  };

  return (
    <>
      {/* ── Header: logo(s) + store selector ──────────────────────────────── */}
      <header style={{
        backgroundColor: t.headerBg,
        borderBottom: t.headerBorder,
        padding: '15px 0',
      }}>
        <div style={{
          maxWidth: MAX_WIDTH,
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
        }}>
          <a href="#/" style={{ display: 'inline-flex', alignItems: 'center', gap: '20px', textDecoration: 'none' }}>
            {t.coBrandLogoSrc && (
              <>
                <img
                  src={t.coBrandLogoSrc}
                  alt="Co-brand"
                  style={{ height: t.coBrandLogoHeight, display: 'block' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span style={{ height: '30px', width: '1px', backgroundColor: '#444', display: 'inline-block' }} />
              </>
            )}
            <img
              src={t.logoSrc}
              alt="Jiffy Lube Multicare"
              style={{ height: t.logoHeight, display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </a>

          {/* Store selector — only renders if a handler is provided */}
          {onStoreChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: t.headerLabelColor,
                letterSpacing: '1px',
              }}>
                STORE:
              </span>
              <select
                value={selectedStore ?? ''}
                onChange={(e) => onStoreChange(e.target.value)}
                style={{
                  padding: '8px 30px 8px 12px',
                  border: `2px solid ${t.accentColor}`,
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#333',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23${t.arrowColorHex}' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                {showStorePlaceholder && (
                  <option value="">Select Store</option>
                )}
                {STORES.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.id} - {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* ── Nav Bar (themed background) ────────────────────────────────────── */}
      <nav style={{ backgroundColor: t.navBg, padding: '12px 0' }}>
        <div style={{
          maxWidth: MAX_WIDTH,
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);

            // Item with dropdown (BUSINESS ACCOUNTS)
            if (item.children) {
              return (
                <div
                  key={item.key}
                  ref={businessRef}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={() => setBusinessOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={businessOpen}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      letterSpacing: '1px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      borderBottom: active
                        ? '2px solid white'
                        : '2px solid transparent',
                      fontFamily: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {item.label}
                    <span style={{ fontSize: '9px', lineHeight: 1 }}>▾</span>
                  </button>
                  {businessOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                      padding: '6px 0',
                      minWidth: '220px',
                      zIndex: 100,
                    }}>
                      {item.children.map((child) => {
                        const childActive = child.key === currentPage;
                        return (
                          <a
                            key={child.key}
                            href={child.href}
                            onClick={() => setBusinessOpen(false)}
                            style={{
                              display: 'block',
                              padding: '10px 16px',
                              color: childActive ? t.accentColor : '#333',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: childActive ? '700' : '600',
                              letterSpacing: '0.5px',
                              backgroundColor: childActive ? '#f5f5f5' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!childActive) e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }}
                            onMouseLeave={(e) => {
                              if (!childActive) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {child.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Plain link
            return (
              <a
                key={item.key}
                href={item.href}
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '1px',
                  padding: '5px 10px',
                  borderBottom: active
                    ? '2px solid white'
                    : '2px solid transparent',
                }}
              >
                {item.label}
              </a>
            );
          })}

          {/* ── Staff Login button / Staff badge ─────────────────────────── */}
          {!isAuthenticated ? (
            <button
              onClick={() => setLoginModalOpen(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '5px 14px',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '1px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🔒 STAFF LOGIN
            </button>
          ) : (
            <span
              style={{
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                padding: '5px 14px',
                borderRadius: '14px',
              }}
              title="Logged in"
            >
              ✓ STAFF{staffDisplayName ? `: ${staffDisplayName.toUpperCase()}` : ''}
            </span>
          )}
        </div>
      </nav>

      {/* ── Staff Login Modal (rendered here so any page using Navbar gets it) ── */}
      <StaffLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
