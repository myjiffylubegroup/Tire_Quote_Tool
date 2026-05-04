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

export default function Navbar({ currentPage, selectedStore, onStoreChange }) {
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
  // Owned by Navbar. Pages that want to trigger the modal from somewhere other
  // than the navbar button (e.g. an inline "Staff? Sign in" hint) can dispatch:
  //   window.dispatchEvent(new Event('jl:open-staff-login'))
  // This avoids prop-drilling or context for what is otherwise a very simple need.
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const open = () => setLoginModalOpen(true);
    window.addEventListener('jl:open-staff-login', open);
    return () => window.removeEventListener('jl:open-staff-login', open);
  }, []);

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
      {/* ── White Header: logo + store selector ────────────────────────────── */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
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
          <a href="#/" style={{ display: 'inline-block' }}>
            <img
              src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
              alt="Jiffy Lube Multicare"
              style={{ height: '50px', display: 'block' }}
            />
          </a>

          {/* Store selector — only renders if a handler is provided */}
          {onStoreChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#666',
                letterSpacing: '1px',
              }}>
                STORE:
              </span>
              <select
                value={selectedStore ?? ''}
                onChange={(e) => onStoreChange(e.target.value)}
                style={{
                  padding: '8px 30px 8px 12px',
                  border: `2px solid ${PURPLE}`,
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  color: '#333',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
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

      {/* ── Purple Nav Bar ─────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: PURPLE, padding: '12px 0' }}>
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
                              color: childActive ? PURPLE : '#333',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: childActive ? '700' : '600',
                              letterSpacing: '0.5px',
                              backgroundColor: childActive ? '#f7f0fa' : 'transparent',
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
