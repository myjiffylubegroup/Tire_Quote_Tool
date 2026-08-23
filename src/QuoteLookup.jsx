import React, { useState, useEffect } from 'react';
import { promoShortLabel } from './promoLabel'
import Navbar from './Navbar';
import { apiCall } from './apiClient';
import {
  concernLabel,
  timePressureLabel,
  serviceClassificationLabel,
  promotedReasonLabel,
  oilTierLabel,
  tmPackageLabel,
  TM_PACKAGE_ADDON_PRICE,
  tireRotationLabel,
  followUpItemLabel,
  followUpResponseLabel,
  waitPreferenceLabel,
  checkinRatingLabel,
  checkinReasonLabel,
  recoveryReasonLabel,
} from './concernLabels';

import { API_BASE } from './config';

const STORES = [
  { id: 609, name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
};

// Time-ago helper for greet cards ("18 min ago", "1 hr ago", "yesterday at 3:42 PM")
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr !== 1 ? 's' : ''} ago`;
  // Same day fallback or older — show the time (forced Pacific, see timePacific).
  return then.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
};

// Format a UTC timestamp as Pacific clock time, e.g. "3:14 PM".
// Forced to America/Los_Angeles regardless of the browser's local timezone —
// keeps the dashboard consistent with how the rest of the stack (Edge Functions,
// date filters) thinks about time, and removes "wrong time on this laptop"
// failure modes.
const timePacific = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric', minute: '2-digit',
  });
};

// Wait preference → icon + short label, for the card display next to the
// classification badge. Mirrors concernLabels.js but returns an icon too.
//   lobby    → 🪑 Lobby
//   in_car   → 🚗 In car
//   drop_off → 🔑 Drop off
// Returns null for unknown values (card omits the chip gracefully).
const waitPreferenceChip = (code) => {
  if (code === 'lobby')    return { icon: '🪑', label: 'Lobby' };
  if (code === 'in_car')   return { icon: '🚗', label: 'In car' };
  if (code === 'drop_off') return { icon: '🔑', label: 'Drop off' };
  return null;
};

// Engine Prep detection: certain GROW codes indicate the customer is getting
// the Throttle Muscle Engine Prep welcome offer. The product is poured into
// the engine BEFORE the car pulls into the bay and runs for 3 minutes — so
// the CSA needs to grab the bottle ahead of time. This drives a loud banner
// at the top of the card.
//
// Display-only signal — read the kiosk's tm_engine_prep_free flag (exposed via
// v_greets_for_staff). True whenever the customer is getting a free Engine Prep
// Service, by any path (Welcome offer or retention save). Replaces a hardcoded
// GROW-code list that silently missed newer EP codes (e.g. the TM16–20
// recaptures) and matches how greets-analytics counts engine prep.
const hasEnginePrep = (greet) => greet?.tm_engine_prep_free === true;

// Appointment detection (July 2026). The kiosk auto-detects a guest's
// confirmed appointment at check-in (matching their email against today's
// booked appointments) and stamps appointment_time on the greet as a
// pre-formatted 12-hour display string ("9:40 AM"). A non-null/non-empty
// value is the signal there's an appointment; it also carries the exact text
// to show, so it's the single field we read (has_appointment='yes' is set in
// tandem but redundant here). NULL = walk-in, or no appointment was matched.
// Display-only: never recompute or reformat — render the kiosk's string as-is.
const greetAppointmentTime = (greet) => {
  const t = greet && greet.appointment_time;
  return (typeof t === 'string' && t.trim()) ? t.trim() : null;
};

// Kiosk theme indicator (Phase 12, June 2026). Racing is the production
// default since 2026-06-12; soccer means the customer tapped the World
// Soccer Tournament unlock. Standard (the fallback URL) gets no chip —
// it's the absence of a theme, not a signal. Why CSAs care: customers use
// the THEMED package names ("Pit Stop High Mileage", "Hat Trick Max
// Protect", "Champion's Treatment") — the chip tells the CSA which naming
// universe the customer is speaking from. The DB always stores canonical
// keys; this is display-side only.
const themeChip = (theme) => {
  if (theme === 'racing') return { icon: '🏁', label: 'RACING', color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' };
  if (theme === 'soccer') return { icon: '⚽', label: 'SOCCER', color: '#166534', bg: '#DCFCE7', border: '#86EFAC' };
  return null;
};

// Build the customer's display name from first + last. Graceful when either
// is missing (older greets may have first name only). Falls back to 'Customer'.
const greetFullName = (greet) => {
  const parts = [greet.customer_first_name, greet.customer_last_name]
    .filter((p) => p && String(p).trim().length > 0);
  return parts.length ? parts.join(' ') : 'Customer';
};

// ── Cart removals ─────────────────────────────────────────────────────────
// Items the customer pulled back out of the cart in the end-of-flow Summary
// edit are recorded in greets.edit_removals ({ at, kind, label, price }). A
// removed item is no longer part of the order, so it must NOT appear in the
// service summary on the card or in the modal — only in the Cart Removals
// report. Match by kind: 'tm' (the TM package, which also drops its bundled
// free Engine Prep), 'rotation' (tire rotation), 'addon' (smog / rideshare).
const greetRemovals = (greet) =>
  Array.isArray(greet && greet.edit_removals) ? greet.edit_removals.filter(Boolean) : [];
const tmRemoved = (greet) => greetRemovals(greet).some((ev) => ev.kind === 'tm');
const rotationRemoved = (greet) => greetRemovals(greet).some((ev) => ev.kind === 'rotation');

// ── Greet → quote handoff ────────────────────────────────────────────────
// Builds the customer object the destination quote tool seeds from, writes a
// single sessionStorage payload (consumed on the other side's mount), and
// routes. The destination pre-fills the plate the CSA taps "Look up" on (we
// never auto-fire) and the customer block — so a new kiosk customer keeps the
// name/phone/email they typed even if the plate decode returns vehicle-only.
// greet_short_code rides along now and is used in Phase 2 to link the
// resulting quote back to the originating greet.
const buildGreetHandoff = (greet) => ({
  source: 'greet',
  greet_short_code: greet.short_code,
  store_id: greet.store_id,
  plate: greet.vehicle_license_plate || '',
  state: greet.vehicle_license_state || 'CA',
  customer: {
    first_name: greet.customer_first_name || '',
    last_name: greet.customer_last_name || '',
    full_name: greetFullName(greet),
    phone: greet.customer_phone || '',
    phone_raw: greet.customer_phone || '',
    email: greet.customer_email || '',
    license_plate: greet.vehicle_license_plate || '',
    license_state: greet.vehicle_license_state || 'CA',
    vin: greet.vehicle_vin || null,
    data_source: 'greet',
  },
});

const startQuoteFromGreet = (greet, kind) => {
  try {
    sessionStorage.setItem('jl_greet_handoff', JSON.stringify(buildGreetHandoff(greet)));
  } catch (e) {
    console.error('Failed to write greet handoff:', e);
    return;
  }
  // tire → TireFinder (#/), mechanical → MechanicalFinder (#/mechanical)
  window.location.hash = kind === 'mechanical' ? '#/mechanical' : '#/';
};

// EXPRESS vs FULL classification badge + card styling.
//   express → red, reads as urgency / get them through fast
//   full    → green, reads as worth the time
// Returns badge colors plus card-level cues:
//   cardBorder — the 4px left border color for the card
//   cardTint   — a very faint background wash reinforcing the border
// Returns null for unknown values (card falls back to its default styling).
const classificationBadge = (code) => {
  if (code === 'express') {
    return {
      label: 'EXPRESS', icon: '⚡',
      color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5',
      cardBorder: '#ef4444', cardTint: '#fef5f5',
    };
  }
  if (code === 'full') {
    return {
      label: 'FULL', icon: '🔧',
      color: '#047857', bg: '#d1fae5', border: '#6ee7b7',
      cardBorder: '#10b981', cardTint: '#f3fbf7',
    };
  }
  return null;
};

// Contact-change alerts derived from field_verification.
// field_verification is a per-field object { first_name, phone, email } whose
// values are one of: verified | verified_new | captured_unverified |
// on_file_unchanged | omitted. Computed kiosk-side; null on older greets.
//
// Flavor A (alert only, no old value). A field fires an alert when:
//   - status === 'verified_new'  (always — proven contact that didn't match file)
//   - status === 'captured_unverified' AND the customer is returning
//     (an edit on a known customer that wasn't verified; new customers type
//      everything fresh, so captured_unverified is normal noise for them)
//
// Returns an array of { field, label, detail } — empty if nothing fires or
// field_verification is absent/malformed.
const contactAlerts = (greet) => {
  const fv = greet && greet.field_verification;
  if (!fv || typeof fv !== 'object') return [];

  const returning = greet.is_returning_vehicle === true;
  const fires = (status) =>
    status === 'verified_new' || (status === 'captured_unverified' && returning);

  const fieldDefs = [
    { key: 'phone', label: '⚠ New phone', detail: 'Phone differs from file — confirm at counter' },
    { key: 'email', label: '⚠ New email', detail: 'Email differs from file — confirm at counter' },
    { key: 'first_name', label: '⚠ Name unverified', detail: 'Name not matched to file — confirm at counter' },
  ];

  const alerts = [];
  for (const def of fieldDefs) {
    if (fires(fv[def.key])) {
      alerts.push({ field: def.key, label: def.label, detail: def.detail });
    }
  }
  return alerts;
};

// Footer Component
const Footer = () => (
  <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '12px' }}>
        <a href="#/about" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>About Us</a>
        <a href="#/contact" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Contact</a>
        <a href="#/privacy-policy" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Privacy Policy</a>
        <a href="#/terms" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Terms & Conditions</a>
        <a href="#/sms-consent" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>SMS Terms</a>
        <a href="#/do-not-sell" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px' }}>Do Not Sell My Info</a>
      </div>
      <p style={{ fontSize: '13px', marginBottom: '8px' }}>
        © 2026 P.C.J.L., Inc. Tire data provided by MOTOR & USAutoForce.
      </p>
      <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
        tires.myjiffylube.ai
      </p>
    </div>
  </footer>
);

// Styled Input
const StyledInput = ({ value, onChange, placeholder, type = 'text', style, ...props }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: 'white',
      color: '#333',
      fontSize: '13px',
      fontWeight: '500',
      outline: 'none',
      boxSizing: 'border-box',
      ...style
    }}
    {...props}
  />
);

// Date input — slightly squared corners so the two visually read as a pair
const DateInput = ({ value, onChange, style }) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #9b59b6',
      borderRadius: '10px',
      backgroundColor: 'white',
      color: '#333',
      fontSize: '13px',
      fontWeight: '500',
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      ...style
    }}
  />
);

// Styled Select
const StyledSelect = ({ value, onChange, options, placeholder, style }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: 'white',
      color: '#333',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      outline: 'none',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 15px center',
      ...style
    }}
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
        {typeof opt === 'object' ? opt.label : opt}
      </option>
    ))}
  </select>
);

export default function QuoteLookup() {
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem('jl_tire_store') || '609');

  // Quote type toggle
  const [quoteMode, setQuoteMode] = useState('tires'); // 'tires' | 'mechanical' | 'greets'

  // Search state (tires/mechanical)
  const [searchType, setSearchType] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const [licenseState, setLicenseState] = useState('CA');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');

  // Date range filter (tires only). Empty string = no filter.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Results state (tires/mechanical)
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [limitApplied, setLimitApplied] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Greets state — kept fully separate from tires/mechanical state so the
  // two paths can never accidentally interfere with each other.
  // ──────────────────────────────────────────────────────────────────────────
  const [greets, setGreets] = useState([]);
  const [greetsLoading, setGreetsLoading] = useState(false);
  const [greetsError, setGreetsError] = useState(null);
  const [selectedGreet, setSelectedGreet] = useState(null); // for detail modal
  const [greetDetailLoading, setGreetDetailLoading] = useState(false);

  // Greets date range — separate from tire/mechanical's dateFrom/dateTo so
  // switching modes doesn't blow away the user's filter on either side.
  // Empty = "today only" (matches the prior locked-to-today behavior).
  const [greetsDateFrom, setGreetsDateFrom] = useState('');
  const [greetsDateTo, setGreetsDateTo] = useState('');
  const [greetsLimitReached, setGreetsLimitReached] = useState(false);

  // Edit / delete mode (managers only — gated by staffProfile.can_delete_greets)
  const [greetsEditMode, setGreetsEditMode] = useState(false);
  const [selectedGreetIds, setSelectedGreetIds] = useState(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Quote void mode (tires only — gated by staffProfile.can_delete_quotes).
  // Mirrors the greets edit/delete flow. Mechanical quotes have no soft-delete
  // column, so this UI never appears in mechanical mode.
  const [quotesEditMode, setQuotesEditMode] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState(new Set());
  const [quoteDeleteConfirmOpen, setQuoteDeleteConfirmOpen] = useState(false);
  const [quoteDeleteReason, setQuoteDeleteReason] = useState('');
  const [quoteDeleteInProgress, setQuoteDeleteInProgress] = useState(false);
  const [quoteDeleteError, setQuoteDeleteError] = useState(null);

  // Staff profile (used to gate the Edit buttons). Fetched once per session.
  const [staffProfile, setStaffProfile] = useState(null);

  // Save store to localStorage
  useEffect(() => {
    localStorage.setItem('jl_tire_store', selectedStore);
  }, [selectedStore]);

  // Load recent quotes on mount / when store or mode changes (tires/mechanical only)
  useEffect(() => {
    if (quoteMode === 'greets') {
      // Greets has its own effect — bail out so we don't fire an unwanted quote search.
      return;
    }
    setQuotes([]);
    setHasSearched(false);
    setLimitReached(false);
    setLimitApplied(null);
    handleSearch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, quoteMode]);

  // Load greets when entering greets mode, switching store, or changing
  // the date range.
  useEffect(() => {
    if (quoteMode !== 'greets') return;
    loadGreets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, quoteMode, greetsDateFrom, greetsDateTo]);

  // Fetch staff profile once per session (gates both the greets Edit UI and
  // the tire-quote Void UI). Fetched on first render regardless of mode.
  useEffect(() => {
    if (staffProfile !== null) return; // already fetched
    (async () => {
      try {
        const response = await apiCall(`${API_BASE}/staff-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.success && data.profile) {
          setStaffProfile(data.profile);
        }
      } catch (e) {
        // Silent failure — non-managers see no Edit button anyway, so a failed
        // profile fetch just keeps Edit hidden. Defense in depth: even if a
        // determined user forces the UI on, the API rejects unauthorized titles.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteMode]);

  // Leaving tires mode or switching store cancels any in-progress quote void.
  useEffect(() => {
    setQuotesEditMode(false);
    setSelectedQuoteIds(new Set());
    setQuoteDeleteConfirmOpen(false);
    setQuoteDeleteReason('');
    setQuoteDeleteError(null);
  }, [selectedStore, quoteMode]);

  // Close out an open leave request. Refetches rather than patching local state:
  // the server arbitrates whether the flag was still open (another crew member
  // may have resolved it seconds earlier, in which case it returns 404).
  const handleResolveLeave = async (greet, outcome) => {
    try {
      const response = await apiCall(`${API_BASE}/greets-leave-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_code: greet.short_code, outcome }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || 'Could not resolve the leave request.');
      }
    } catch (e) {
      alert('Could not reach the server to resolve the leave request.');
    }
    loadGreets();
  };

  const loadGreets = async () => {
    setGreetsLoading(true);
    setGreetsError(null);
    setGreets([]);
    setGreetsLimitReached(false);

    try {
      // Date range: empty fields → today only (kiosk-side default).
      // When the user provides a range, we ask for the larger 500-row cap
      // matching search-quotes' behavior.
      const hasDateFilter = Boolean(greetsDateFrom || greetsDateTo);
      const body = {
        store_id: parseInt(selectedStore),
        date_from: greetsDateFrom || undefined,
        date_to: greetsDateTo || undefined,
        limit: hasDateFilter ? 500 : undefined,
      };

      const response = await apiCall(`${API_BASE}/greets-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setGreets(data.greets || []);
        setGreetsLimitReached(Boolean(data.result_limit_reached));
      } else {
        setGreetsError(data.error || 'Failed to load greets');
      }
    } catch (e) {
      setGreetsError('Failed to connect to server');
    }

    setGreetsLoading(false);
  };

  // Open the detail modal for a greet. Re-fetches via get-greet so the modal
  // always reflects the latest data — list payload may be a few seconds stale.
  const openGreetDetail = async (greet) => {
    // Show the list-level payload immediately so the modal opens instantly,
    // then upgrade with the fresh detail when it arrives.
    setSelectedGreet(greet);
    setGreetDetailLoading(true);

    try {
      const response = await apiCall(`${API_BASE}/get-greet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_code: greet.short_code,
          store_id: parseInt(selectedStore),
        })
      });

      const data = await response.json();

      if (data.success && data.greet) {
        // Only update if the user hasn't closed the modal in the meantime
        setSelectedGreet((current) => current && current.short_code === greet.short_code ? data.greet : current);
      }
      // If the fetch fails, just keep the list-level payload — no error UX needed,
      // CSA still sees most of the data.
    } catch (e) {
      // Same — silently fall back to the list-level payload.
    }

    setGreetDetailLoading(false);
  };

  const closeGreetDetail = () => {
    setSelectedGreet(null);
    setGreetDetailLoading(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Edit / delete mode for greets (managers only).
  // ──────────────────────────────────────────────────────────────────────────

  // Cap matches the soft-delete-greets edge function's enforced cap.
  const GREETS_DELETE_MAX_PER_CALL = 100;

  const enterGreetsEditMode = () => {
    setGreetsEditMode(true);
    setSelectedGreetIds(new Set());
  };

  const exitGreetsEditMode = () => {
    setGreetsEditMode(false);
    setSelectedGreetIds(new Set());
    setDeleteConfirmOpen(false);
    setDeleteReason('');
    setDeleteError(null);
  };

  const toggleGreetSelection = (greetId) => {
    setSelectedGreetIds((prev) => {
      const next = new Set(prev);
      if (next.has(greetId)) {
        next.delete(greetId);
      } else if (next.size < GREETS_DELETE_MAX_PER_CALL) {
        next.add(greetId);
      }
      // Silently cap at 100 — the API enforces this too. If a user runs into
      // the cap, the disabled "Delete N selected" button stops growing, which
      // is the cue.
      return next;
    });
  };

  const openDeleteConfirm = () => {
    if (selectedGreetIds.size === 0) return;
    setDeleteReason('');
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteInProgress) return; // don't allow close mid-call
    setDeleteConfirmOpen(false);
    setDeleteReason('');
    setDeleteError(null);
  };

  const confirmDeleteGreets = async () => {
    if (!deleteReason) return;
    if (selectedGreetIds.size === 0) return;

    // Map ids → short_codes (the API works on short_codes per the spec)
    const idToShortCode = new Map(greets.map((g) => [g.greet_id, g.short_code]));
    const shortCodes = Array.from(selectedGreetIds)
      .map((id) => idToShortCode.get(id))
      .filter(Boolean);

    setDeleteInProgress(true);
    setDeleteError(null);

    try {
      const response = await apiCall(`${API_BASE}/soft-delete-greets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_codes: shortCodes,
          reason: deleteReason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setDeleteError(data.error || 'Delete failed');
        setDeleteInProgress(false);
        return;
      }

      // Success — exit edit mode and refresh the list.
      setDeleteInProgress(false);
      setDeleteConfirmOpen(false);
      // Per Sean's spec choice: auto-exit edit mode after a successful delete.
      exitGreetsEditMode();
      loadGreets();
    } catch (e) {
      setDeleteError('Failed to connect to server');
      setDeleteInProgress(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Void mode for tire quotes (managers only). Mirrors the greets flow above.
  // TIRES ONLY — mechanical_quotes has no soft-delete column, so the Edit
  // button never appears in mechanical mode. Operates on quote_ids (uuid).
  // Paid quotes are blocked by the backend (409 + paid_quote_numbers).
  // ──────────────────────────────────────────────────────────────────────────

  // Cap matches the soft-delete-quotes edge function's enforced cap.
  const QUOTES_DELETE_MAX_PER_CALL = 100;

  const enterQuotesEditMode = () => {
    setQuotesEditMode(true);
    setSelectedQuoteIds(new Set());
  };

  const exitQuotesEditMode = () => {
    setQuotesEditMode(false);
    setSelectedQuoteIds(new Set());
    setQuoteDeleteConfirmOpen(false);
    setQuoteDeleteReason('');
    setQuoteDeleteError(null);
  };

  const toggleQuoteSelection = (quoteId) => {
    setSelectedQuoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else if (next.size < QUOTES_DELETE_MAX_PER_CALL) {
        next.add(quoteId);
      }
      // Silently cap at 100 — the API enforces this too. The disabled Void
      // button and cap banner are the cue.
      return next;
    });
  };

  const openQuoteDeleteConfirm = () => {
    if (selectedQuoteIds.size === 0) return;
    setQuoteDeleteReason('');
    setQuoteDeleteError(null);
    setQuoteDeleteConfirmOpen(true);
  };

  const closeQuoteDeleteConfirm = () => {
    if (quoteDeleteInProgress) return; // don't allow close mid-call
    setQuoteDeleteConfirmOpen(false);
    setQuoteDeleteReason('');
    setQuoteDeleteError(null);
  };

  const confirmDeleteQuotes = async () => {
    if (!quoteDeleteReason) return;
    if (selectedQuoteIds.size === 0) return;

    const quoteIds = Array.from(selectedQuoteIds);

    setQuoteDeleteInProgress(true);
    setQuoteDeleteError(null);

    try {
      const response = await apiCall(`${API_BASE}/soft-delete-quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_ids: quoteIds,
          reason: quoteDeleteReason,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Paid quotes can't be voided — the backend returns 409 with the
        // offending quote numbers so the CSA knows which to unselect.
        if (data.paid_quote_numbers && data.paid_quote_numbers.length > 0) {
          setQuoteDeleteError(
            `These quotes were paid online and can't be voided: ${data.paid_quote_numbers.join(', ')}. Unselect them and try again.`
          );
        } else {
          setQuoteDeleteError(data.error || 'Void failed');
        }
        setQuoteDeleteInProgress(false);
        return;
      }

      // Success — optimistically drop the voided rows so they vanish instantly,
      // then exit edit mode and re-run the search to reconcile with the server
      // (search-quotes already filters out voided quotes).
      const deleted = new Set(quoteIds);
      setQuotes((prev) => prev.filter((q) => !deleted.has(q.quote_id)));
      setQuoteDeleteInProgress(false);
      setQuoteDeleteConfirmOpen(false);
      exitQuotesEditMode();
      handleSearch();
    } catch (e) {
      setQuoteDeleteError('Failed to connect to server');
      setQuoteDeleteInProgress(false);
    }
  };

  const handleSearch = async (initialLoad = false) => {
    setLoading(true);
    setError(null);
    if (!initialLoad) setHasSearched(true);

    try {
      const endpoint = quoteMode === 'mechanical' ? 'search-mechanical-quotes' : 'search-quotes';

      // Only send date params for tire quotes (search-mechanical-quotes does not support them yet)
      const dateParams = (quoteMode === 'tires')
        ? {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          }
        : {};

      // If a date range is in play, ask for the higher 500 cap; otherwise default to 50
      const hasDateFilter = quoteMode === 'tires' && (dateFrom || dateTo);
      const limit = hasDateFilter ? 500 : 50;

      const response = await apiCall(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: parseInt(selectedStore),
          search_type: searchValue.trim() ? searchType : 'all',
          search_value: searchValue.trim() || undefined,
          license_state: searchType === 'plate' ? licenseState : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          filter_status: quoteMode === 'mechanical' ? undefined : filterStatus,
          ...dateParams,
          limit,
        })
      });

      const data = await response.json();

      if (data.success) {
        setQuotes(data.quotes || []);
        setLimitReached(Boolean(data.result_limit_reached));
        setLimitApplied(data.limit_applied ?? null);
      } else {
        setError(data.error || 'Failed to search quotes');
      }
    } catch (e) {
      setError('Failed to connect to server');
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    setSearchType('name');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
    setHasSearched(false);
    setLimitReached(false);
    setLimitApplied(null);
    handleSearch(true);
  };

  const openQuote = (shortCode) => {
    if (quoteMode === 'mechanical') {
      window.location.hash = `#/mechanical/${shortCode}`;
    } else {
      window.location.hash = `#/quote/${shortCode}`;
    }
  };

  // Check if quote was created today (Pacific time) — matches get-quote is_editable logic
  const isSameDay = (createdAt) => {
    if (!createdAt) return false;
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const created = new Date(new Date(createdAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return pacific.getFullYear() === created.getFullYear() &&
           pacific.getMonth() === created.getMonth() &&
           pacific.getDate() === created.getDate();
  };

  const editQuote = (shortCode) => {
    window.location.hash = `#/quote/${shortCode}?edit=true`;
  };

  // Re-Quote: fetch full quote data, stash to sessionStorage, navigate to TireFinder
  const [reQuoting, setReQuoting] = useState(null);
  const reQuote = async (quoteId) => {
    setReQuoting(quoteId);
    try {
      const response = await apiCall(`${API_BASE}/get-quote?id=${quoteId}`);
      const data = await response.json();
      if (data.success && data.quote) {
        const q = data.quote;
        const reQuoteData = {
          from_quote_id: q.quote_id,
          from_quote_number: q.quote_number,
          customer: {
            first_name: q.customer.first_name || '',
            last_name: q.customer.last_name || '',
            full_name: q.customer.full_name || '',
            phone: q.customer.phone || '',
            email: q.customer.email || '',
            license_plate: q.customer.license_plate || '',
            license_state: q.customer.license_state || 'CA',
            data_source: q.customer.data_source || 'manual'
          },
          vehicle: q.vehicle || null,
          tire_size: q.tire?.size || null,
          treads: q.tread_depth || null,
          store_id: q.store?.id || null,
          quantity: q.pricing?.quantity || 4
        };
        sessionStorage.setItem('jl_requote_data', JSON.stringify(reQuoteData));
        sessionStorage.setItem('jl_requote_pending', 'true');
        window.location.hash = '#/';
      } else {
        setError('Failed to load quote for re-quoting');
      }
    } catch (e) {
      setError('Failed to connect to server');
    } finally {
      setReQuoting(null);
    }
  };

  // The header text and helper depend on mode
  const headerTitle = quoteMode === 'greets' ? 'Today\'s Greets' : 'Retrieve Quote';
  const headerSubtitle = quoteMode === 'greets'
    ? 'Customers who pre-checked in at the kiosk — find them by their 4-character code'
    : 'Search saved quotes by customer name, license plate, phone, or quote number';

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="quotes"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>

        {/* Search Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '25px'
        }}>
          <h2 style={{
            color: '#9b59b6',
            fontSize: '24px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {headerTitle}
          </h2>
          <p style={{
            color: '#888',
            textAlign: 'center',
            fontSize: '13px',
            marginBottom: '20px',
            letterSpacing: '1px'
          }}>
            {headerSubtitle}
          </p>

          {/* Mode toggle — Tires / Mechanical / Greets */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '25px', border: '2px solid #9b59b6', borderRadius: '25px', overflow: 'hidden', width: 'fit-content', margin: '0 auto 25px' }}>
            <button
              onClick={() => setQuoteMode('tires')}
              style={{
                padding: '10px 24px', border: 'none', cursor: 'pointer',
                backgroundColor: quoteMode === 'tires' ? '#9b59b6' : 'white',
                color: quoteMode === 'tires' ? 'white' : '#9b59b6',
                fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
              }}
            >
              🛞 Tire Quotes
            </button>
            <button
              onClick={() => setQuoteMode('mechanical')}
              style={{
                padding: '10px 24px', border: 'none', cursor: 'pointer',
                backgroundColor: quoteMode === 'mechanical' ? '#9b59b6' : 'white',
                color: quoteMode === 'mechanical' ? 'white' : '#9b59b6',
                fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
                borderLeft: '1px solid #9b59b6',
                borderRight: '1px solid #9b59b6',
              }}
            >
              🔧 Mechanical Quotes
            </button>
            <button
              onClick={() => setQuoteMode('greets')}
              style={{
                padding: '10px 24px', border: 'none', cursor: 'pointer',
                backgroundColor: quoteMode === 'greets' ? '#9b59b6' : 'white',
                color: quoteMode === 'greets' ? 'white' : '#9b59b6',
                fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
              }}
            >
              👋 Greets
            </button>
          </div>

          {/* Search form is hidden in Greets mode (no search; today-only view) */}
          {quoteMode !== 'greets' && (
            <>
              {/* Search Form — Row 1: What to search for */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '15px' }}>

                {/* Search Type */}
                <div style={{ width: '170px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                    SEARCH BY
                  </label>
                  <StyledSelect
                    value={searchType}
                    onChange={setSearchType}
                    options={[
                      { value: 'name', label: 'Customer Name' },
                      { value: 'plate', label: 'License Plate' },
                      { value: 'phone', label: 'Phone Number' },
                      { value: 'quote_number', label: 'Quote Number' },
                    ]}
                    placeholder="Select..."
                  />
                </div>

                {/* Search Value */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                    {searchType === 'name' ? 'CUSTOMER NAME' :
                     searchType === 'plate' ? 'LICENSE PLATE' :
                     searchType === 'phone' ? 'PHONE NUMBER' : 'QUOTE NUMBER'}
                  </label>
                  <StyledInput
                    value={searchValue}
                    onChange={setSearchValue}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      searchType === 'name' ? 'e.g., John Smith' :
                      searchType === 'plate' ? 'e.g., 8ABC123' :
                      searchType === 'phone' ? 'e.g., 805-555-1234' :
                      'e.g., JL-609-20260128-001'
                    }
                  />
                </div>

                {/* License State (only for plate search) */}
                {searchType === 'plate' && (
                  <div style={{ width: '110px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                      STATE
                    </label>
                    <StyledSelect
                      value={licenseState}
                      onChange={setLicenseState}
                      options={US_STATES}
                      placeholder="State"
                    />
                  </div>
                )}

                {/* Date Range — tires only */}
                {quoteMode === 'tires' && (
                  <div style={{ width: '320px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                      DATE RANGE
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <DateInput
                          value={dateFrom}
                          onChange={setDateFrom}
                        />
                      </div>
                      <span style={{ color: '#9b59b6', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>→</span>
                      <div style={{ flex: 1 }}>
                        <DateInput
                          value={dateTo}
                          onChange={setDateTo}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Form — Row 2: How to display + actions */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

                {/* Sort By */}
                <div style={{ width: '140px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                    SORT BY
                  </label>
                  <StyledSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: 'date', label: 'Date' },
                      { value: 'name', label: 'Name' },
                    ]}
                    placeholder="Sort..."
                  />
                </div>

                {/* Sort Order */}
                <div style={{ width: '150px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                    ORDER
                  </label>
                  <StyledSelect
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={[
                      { value: 'desc', label: 'Newest First' },
                      { value: 'asc', label: 'Oldest First' },
                    ]}
                    placeholder="Order..."
                  />
                </div>

                {/* Conversion Filter — tires only */}
                {quoteMode === 'tires' && (
                  <div style={{ width: '180px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                      FILTER
                    </label>
                    <StyledSelect
                      value={filterStatus}
                      onChange={setFilterStatus}
                      options={[
                        { value: 'all', label: 'All Quotes' },
                        { value: 'needs_followup', label: '🔴🟡 Needs Follow-up' },
                        { value: 'purchased', label: '✅ Purchased' },
                        { value: 'not_purchased', label: '— Not Purchased' },
                        { value: 'unmatched', label: '? Unmatched' },
                      ]}
                      placeholder="Filter..."
                    />
                  </div>
                )}

                {/* Spacer to push buttons right */}
                <div style={{ flex: 1, minWidth: '0' }} />

                {/* Search Button */}
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  style={{
                    backgroundColor: '#9b59b6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '25px',
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'SEARCHING...' : 'SEARCH'}
                </button>

                {/* Clear Button */}
                {hasSearched && (
                  <button
                    onClick={handleClear}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '25px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {error && (
                <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
                  {error}
                </p>
              )}
            </>
          )}

          {/* In greets mode, show the date range + refresh + edit controls
              instead of the search form. */}
          {quoteMode === 'greets' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: '320px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                    DATE RANGE (LEAVE BLANK FOR TODAY)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <DateInput value={greetsDateFrom} onChange={setGreetsDateFrom} />
                    </div>
                    <span style={{ color: '#9b59b6', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>→</span>
                    <div style={{ flex: 1 }}>
                      <DateInput value={greetsDateTo} onChange={setGreetsDateTo} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={loadGreets}
                  disabled={greetsLoading}
                  style={{
                    backgroundColor: '#9b59b6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '25px',
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    cursor: greetsLoading ? 'not-allowed' : 'pointer',
                    opacity: greetsLoading ? 0.7 : 1,
                  }}
                >
                  {greetsLoading ? 'REFRESHING...' : '↻ REFRESH'}
                </button>

                {(greetsDateFrom || greetsDateTo) && (
                  <button
                    onClick={() => { setGreetsDateFrom(''); setGreetsDateTo(''); }}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '25px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    CLEAR DATES
                  </button>
                )}

                {/* Edit button — manager-only. The API enforces this too;
                    hiding the button is UX, not the security boundary. */}
                {staffProfile?.can_delete_greets && !greetsEditMode && (
                  <button
                    onClick={enterGreetsEditMode}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#9b59b6',
                      border: '2px solid #9b59b6',
                      padding: '8px 20px',
                      borderRadius: '25px',
                      fontSize: '13px',
                      fontWeight: '700',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                    }}
                  >
                    ✎ EDIT
                  </button>
                )}

                {greetsEditMode && (
                  <>
                    <button
                      onClick={openDeleteConfirm}
                      disabled={selectedGreetIds.size === 0}
                      style={{
                        backgroundColor: selectedGreetIds.size === 0 ? '#fca5a5' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '10px 22px',
                        borderRadius: '25px',
                        fontSize: '13px',
                        fontWeight: '700',
                        letterSpacing: '1px',
                        cursor: selectedGreetIds.size === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      🗑 DELETE {selectedGreetIds.size > 0 ? `${selectedGreetIds.size} SELECTED` : 'SELECTED'}
                    </button>
                    <button
                      onClick={exitGreetsEditMode}
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '25px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      DONE
                    </button>
                  </>
                )}
              </div>

              {greetsError && (
                <div style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>{greetsError}</div>
              )}

              {greetsEditMode && selectedGreetIds.size >= GREETS_DELETE_MAX_PER_CALL && (
                <div style={{ color: '#92400e', backgroundColor: '#fef3c7', textAlign: 'center', marginTop: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                  ⚠ Reached the {GREETS_DELETE_MAX_PER_CALL}-record cap. Delete these first, then select more if needed.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Results Header */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px 25px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              {quoteMode === 'greets'
                ? `${greets.length} Greet${greets.length !== 1 ? 's' : ''} ${(greetsDateFrom || greetsDateTo) ? 'in Range' : 'Today'}`
                : `${quotes.length} Quote${quotes.length !== 1 ? 's' : ''} Found`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Void controls — tires only, manager-only. The API enforces
                  this too; hiding the button is UX, not the security boundary. */}
              {quoteMode === 'tires' && staffProfile?.can_delete_quotes && !quotesEditMode && quotes.length > 0 && (
                <button
                  onClick={enterQuotesEditMode}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#9b59b6',
                    border: '2px solid #9b59b6',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                  }}
                >
                  ✎ EDIT
                </button>
              )}

              {quoteMode === 'tires' && quotesEditMode && (
                <>
                  <button
                    onClick={openQuoteDeleteConfirm}
                    disabled={selectedQuoteIds.size === 0}
                    style={{
                      backgroundColor: selectedQuoteIds.size === 0 ? '#fca5a5' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '1px',
                      cursor: selectedQuoteIds.size === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    🗑 VOID {selectedQuoteIds.size > 0 ? `${selectedQuoteIds.size} SELECTED` : 'SELECTED'}
                  </button>
                  <button
                    onClick={exitQuotesEditMode}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    DONE
                  </button>
                </>
              )}

              <span style={{ fontSize: '12px', color: '#888' }}>
                Store: {STORES.find(s => s.id === parseInt(selectedStore))?.name || selectedStore}
              </span>
            </div>
          </div>

          {/* Cap-reached banner for quote void mode (tires only) */}
          {quoteMode === 'tires' && quotesEditMode && selectedQuoteIds.size >= QUOTES_DELETE_MAX_PER_CALL && (
            <div style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '10px 25px',
              fontSize: '12px',
              fontWeight: '600',
              borderBottom: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              ⚠ Reached the {QUOTES_DELETE_MAX_PER_CALL}-quote cap. Void these first, then select more if needed.
            </div>
          )}

          {/* Limit-reached banner (tires/mechanical only) */}
          {quoteMode !== 'greets' && limitReached && limitApplied != null && (
            <div style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '10px 25px',
              fontSize: '12px',
              fontWeight: '600',
              borderBottom: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              ⚠ Showing the first {limitApplied} results. There may be more — narrow your date range or refine your search.
            </div>
          )}

          {/* Limit-reached banner (greets, when filtering by date) */}
          {quoteMode === 'greets' && greetsLimitReached && (
            <div style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '10px 25px',
              fontSize: '12px',
              fontWeight: '600',
              borderBottom: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              ⚠ Showing the first 500 greets. Narrow your date range to see more.
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* GREETS MODE — card list                                          */}
          {/* ──────────────────────────────────────────────────────────────── */}
          {quoteMode === 'greets' ? (
            greetsLoading ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
                <p>Loading greets...</p>
              </div>
            ) : greets.length > 0 ? (
              <div style={{ padding: '20px', display: 'grid', gap: '15px' }}>
                {greets.map((g) => (
                  <GreetCard
                    key={g.greet_id}
                    greet={g}
                    onOpen={() => openGreetDetail(g)}
                    editMode={greetsEditMode}
                    selected={selectedGreetIds.has(g.greet_id)}
                    onToggleSelect={() => toggleGreetSelection(g.greet_id)}
                    onResolveLeave={handleResolveLeave}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                  {(greetsDateFrom || greetsDateTo) ? 'No greets in that date range' : 'No greets yet today'}
                </p>
                <p style={{ fontSize: '13px' }}>
                  {(greetsDateFrom || greetsDateTo)
                    ? 'Try adjusting the date range, or clear it to see today\'s greets.'
                    : 'Customers who use the kiosk will appear here. Tap REFRESH to check again.'}
                </p>
              </div>
            )
          ) : (
            /* ────────────────────────────────────────────────────────────── */
            /* TIRES / MECHANICAL MODE — existing table                       */
            /* ────────────────────────────────────────────────────────────── */
            quotes.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: quoteMode === 'tires' ? '1240px' : '880px', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                      {quotesEditMode && (
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#666', width: '40px' }}></th>
                      )}
                      <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Quote #</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Date</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Customer</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Vehicle</th>
                      {quoteMode === 'tires' ? (
                        <>
                          <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Tread</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Tire</th>
                        </>
                      ) : (
                        <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Services</th>
                      )}
                      <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Total</th>
                      {quoteMode === 'tires' && (
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Purchased</th>
                      )}
                      <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Status</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666', minWidth: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, idx) => {
                      const isSelected = quotesEditMode && selectedQuoteIds.has(quote.quote_id);
                      const restingBg = isSelected ? '#ede9fe' : (idx % 2 === 0 ? 'white' : '#fafafa');
                      return (
                      <tr
                        key={quote.quote_id}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: restingBg,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onClick={() => quotesEditMode ? toggleQuoteSelection(quote.quote_id) : openQuote(quote.short_code)}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = restingBg}
                      >
                        {quotesEditMode && (
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuoteSelection(quote.quote_id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ accentColor: '#9b59b6', width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '12px 15px', fontWeight: '600', color: '#9b59b6' }}>
                          {quote.quote_number}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#666' }}>
                          {formatDate(quote.created_at)}
                        </td>
                        <td style={{ padding: '12px 15px' }}>
                          <div style={{ fontWeight: '500', color: '#333' }}>{quote.customer.full_name}</div>
                          {quote.customer.phone && (
                            <div style={{ fontSize: '11px', color: '#888' }}>{formatPhone(quote.customer.phone)}</div>
                          )}
                          {quote.customer.license_plate && (
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              {quote.customer.license_plate} ({quote.customer.license_state})
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#666', maxWidth: '200px' }}>
                          <div style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {quote.vehicle_display}
                          </div>
                        </td>
                        {quoteMode === 'tires' && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {quote.tread ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', flexWrap: 'nowrap' }}>
                              {quote.tread.red_count > 0 && <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🔴 {quote.tread.red_count}</span>}
                              {quote.tread.yellow_count > 0 && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🟡 {quote.tread.yellow_count}</span>}
                              {quote.tread.green_count > 0 && quote.tread.red_count === 0 && quote.tread.yellow_count === 0 && <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🟢 {quote.tread.green_count}</span>}
                            </div>
                          ) : <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>}
                        </td>
                        )}
                        {quoteMode === 'tires' ? (
                          <td style={{ padding: '12px 15px', color: '#666' }}>
                            <div style={{ fontWeight: '500' }}>{quote.tire?.brand} {quote.tire?.size}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>Qty: {quote.quantity}</div>
                          </td>
                        ) : (
                          <td style={{ padding: '12px 15px', textAlign: 'center', color: '#666' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600' }}>{quote.item_count} labor</div>
                            {quote.parts_count > 0 && <div style={{ fontSize: '11px', color: '#888' }}>{quote.parts_count} parts</div>}
                          </td>
                        )}
                        <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                          {formatCurrency(quoteMode === 'mechanical' ? quote.total : quote.total_amount)}
                        </td>
                        {quoteMode === 'tires' && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {quote.conversion ? (
                            quote.conversion.status === 'purchased' ? (
                              <span
                                title={`${quote.conversion.tires_purchased} tire${quote.conversion.tires_purchased !== 1 ? 's' : ''} · Store ${quote.conversion.purchase_store} · ${quote.conversion.days_to_purchase} day${quote.conversion.days_to_purchase !== 1 ? 's' : ''}`}
                                style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', cursor: 'default' }}>
                                ✅ {quote.conversion.tires_purchased}
                              </span>
                            ) : quote.conversion.status === 'unmatched' ? (
                              <span style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>
                                NO PLATE
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                            )
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                          )}
                        </td>
                        )}
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          {quote.is_expired ? (
                            <span style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              EXPIRED
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {quotesEditMode ? (
                            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                          ) : (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openQuote(quote.short_code); }}
                              style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              VIEW
                            </button>
                            {quoteMode === 'tires' && isSameDay(quote.created_at) && !quote.is_expired && (
                              <button
                                onClick={(e) => { e.stopPropagation(); editQuote(quote.short_code); }}
                                style={{ backgroundColor: 'transparent', color: '#9b59b6', border: '1.5px solid #9b59b6', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                              >
                                EDIT
                              </button>
                            )}
                            {quoteMode === 'tires' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); reQuote(quote.quote_id); }}
                                disabled={reQuoting === quote.quote_id}
                                style={{ backgroundColor: 'transparent', color: '#3b82f6', border: '1.5px solid #3b82f6', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: reQuoting === quote.quote_id ? 'wait' : 'pointer', opacity: reQuoting === quote.quote_id ? 0.5 : 1 }}
                              >
                                {reQuoting === quote.quote_id ? '...' : 'RE-QUOTE'}
                              </button>
                            )}
                          </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
                {loading ? (
                  <p>Searching...</p>
                ) : hasSearched ? (
                  <>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>No quotes found</p>
                    <p style={{ fontSize: '13px' }}>Try adjusting your search criteria</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '16px', marginBottom: '10px' }}>Recent quotes will appear here</p>
                    <p style={{ fontSize: '13px' }}>Enter search criteria above to find specific quotes</p>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Detail Modal — only mounted when a greet is selected */}
      {selectedGreet && (
        <GreetDetailModal
          greet={selectedGreet}
          onClose={closeGreetDetail}
          loading={greetDetailLoading}
        />
      )}

      {/* Delete confirmation modal (managers only) */}
      {deleteConfirmOpen && (
        <DeleteGreetsConfirmModal
          count={selectedGreetIds.size}
          reason={deleteReason}
          onReasonChange={setDeleteReason}
          onCancel={closeDeleteConfirm}
          onConfirm={confirmDeleteGreets}
          inProgress={deleteInProgress}
          error={deleteError}
        />
      )}

      {/* Void confirmation modal for tire quotes (managers only) */}
      {quoteDeleteConfirmOpen && (
        <DeleteQuotesConfirmModal
          count={selectedQuoteIds.size}
          reason={quoteDeleteReason}
          onReasonChange={setQuoteDeleteReason}
          onCancel={closeQuoteDeleteConfirm}
          onConfirm={confirmDeleteQuotes}
          inProgress={quoteDeleteInProgress}
          error={quoteDeleteError}
        />
      )}

      <Footer />
    </div>
  );
}

// =============================================================================
// ── Check-in feedback (Screen 15 post-submit survey) ─────────────────────────
// The guest rates the kiosk check-in experience after submitting. All of this
// is display-only — the kiosk (greets-feedback) owns every write; the staff
// side only reads.
//
// checkin_feedback_at is the authoritative "has feedback" test (NULL = nothing
// to show — do NOT test checkin_rating, which is also NULL pre-submit).
// checkin_rating is 'great' | 'okay' | 'rough'.
const hasCheckinFeedback = (greet) => Boolean(greet && greet.checkin_feedback_at);

// Visual treatment per rating. `rough` is the detractor a manager should catch
// in person, so it gets the loud red treatment; `okay` a lighter amber neutral;
// `great` a subtle green positive marker. Returns null for unknown values.
const checkinRatingStyle = (rating) => {
  if (rating === 'rough') return { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', icon: '⚠' };
  if (rating === 'okay')  return { color: '#b45309', bg: '#fef3c7', border: '#fcd34d', icon: '•' };
  if (rating === 'great') return { color: '#065f46', bg: '#d1fae5', border: '#6ee7b7', icon: '✓' };
  return null;
};

// Humanize the checkin_reasons key array into labels (safe on null / empty).
const checkinReasonLabels = (greet) =>
  (Array.isArray(greet && greet.checkin_reasons) ? greet.checkin_reasons : [])
    .filter(Boolean)
    .map(checkinReasonLabel);

// checkin_severity is a 0–1 numeric (higher = worse), issued by the kiosk's
// greets-feedback. NULL means it wasn't scored (chips-only feedback, or a
// non-oil flow) — NOT "not severe" — so urgency is only asserted when a real
// score clears the threshold. Single knob, tune here.
const CHECKIN_SEVERITY_URGENT = 0.86;
const checkinIsUrgent = (greet) => {
  const s = greet && greet.checkin_severity;
  return s != null && Number(s) >= CHECKIN_SEVERITY_URGENT;
};

// Small affordance chip: the guest left a free-text comment. The card never
// renders the comment text itself (a 500-char paragraph would blow out the
// card height and wreck the scan-ability of the list) — this marker just
// signals "there's a comment," and the full text shows in the detail modal on
// click. `onDark` styles it for the red rough banner.
function CheckinCommentMarker({ onDark = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '700', letterSpacing: '0.2px',
      padding: '2px 8px', borderRadius: '999px',
      color: onDark ? '#ffffff' : '#3730a3',
      backgroundColor: onDark ? 'rgba(255,255,255,0.18)' : '#eef2ff',
      border: `1px solid ${onDark ? 'rgba(255,255,255,0.5)' : '#c7d2fe'}`,
    }}>
      💬 Comment
    </span>
  );
}

// =============================================================================
// RecoveryVoucherChip — the check-in recovery discount the cashier honors at
// the register. Shows even if the guest forgot to show their phone, so it's the
// staff's own copy of the code.
//
// Display-only: code / amount / reason are authoritative from the greet row
// (issued by the kiosk's greets-feedback), never recomputed here. There is no
// "mark redeemed" write path on the staff side, so this reflects whatever state
// the row already holds — it can display REDEEMED (if some other path flips the
// flag) but cannot set it. Renders nothing when there's no code.
// =============================================================================
function RecoveryVoucherChip({ greet, size = 'normal' }) {
  const code = greet && greet.recovery_code;
  if (!code) return null;

  const compact = size === 'compact';
  const amount = greet.recovery_amount != null ? formatCurrency(Number(greet.recovery_amount)) : null;
  const reason = recoveryReasonLabel(greet.recovery_reason);
  const redeemed = greet.recovery_redeemed === true;

  if (redeemed) {
    const by = greet.recovery_redeemed_by;
    const at = greet.recovery_redeemed_at;
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        backgroundColor: '#f1f5f9', color: '#64748b',
        border: '1px solid #cbd5e1', borderRadius: '10px',
        padding: compact ? '4px 10px' : '8px 14px',
        fontSize: compact ? '11px' : '13px', fontWeight: '600',
      }}>
        <span>✓ Redeemed{amount ? ` · ${amount}` : ''} · {code}</span>
        {(by || at) && !compact && (
          <span style={{ fontSize: '11px', fontWeight: '500', opacity: 0.85 }}>
            {by ? `by ${by}` : ''}{by && at ? ' · ' : ''}{at ? timePacific(at) : ''}
          </span>
        )}
      </div>
    );
  }

  // Pending — the cashier's copy of the code. Made deliberately obvious.
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      backgroundColor: '#ecfdf5', border: '2px solid #6ee7b7', borderRadius: '10px',
      padding: compact ? '5px 10px' : '10px 14px',
    }}>
      <span style={{
        fontSize: compact ? '11px' : '13px', fontWeight: '800', letterSpacing: '0.3px',
        color: '#065f46', textTransform: 'uppercase',
      }}>
        💸 {amount ? `${amount} ` : ''}{reason}
      </span>
      <GrowCodeChip code={code} size={compact ? 'compact' : 'normal'} />
      <span style={{
        fontSize: compact ? '10px' : '12px', fontWeight: '700', color: '#047857',
        letterSpacing: '0.3px', textTransform: 'uppercase',
      }}>
        honor at register
      </span>
    </div>
  );
}

// =============================================================================
// GreetCard — list-view card for a single greet
// =============================================================================
// Staff-facing labels for the leave-request vocabulary. Mirrors GreetsBoard.jsx
// here and the greets repo's copies — one wording across every surface.
const LEAVE_REASON_LABELS = {
  wait_too_long:        'wait is too long',
  need_to_be_somewhere: 'has to be somewhere',
  changed_mind:         'changed their mind',
  price:                'price concern',
  emergency:            'emergency',
  service_concern:      'concern about the service',
  other:                'unspecified',
};
function leaveReasonLabel(k) {
  return LEAVE_REASON_LABELS[k] || (k || '').replace(/_/g, ' ');
}
function leaveWaitingMinutes(greet) {
  if (!greet.leave_requested_at) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(greet.leave_requested_at).getTime()) / 60000));
}

function GreetCard({ greet, onOpen, editMode = false, selected = false, onToggleSelect, onResolveLeave }) {
  const promoted = greet.classification_promoted === true;
  const hasConcerns = (greet.concerns_selected && greet.concerns_selected.length > 0)
    || (greet.concerns_text && greet.concerns_text.trim().length > 0);
  const alerts = contactAlerts(greet);
  const prepNeeded = hasEnginePrep(greet);
  // Full-bleed top elements stack in this order: appointment ribbon → engine
  // prep → rough-checkin apology. Whichever is topmost rounds its top-right
  // corner; the ones below it are squared off so the stack reads as one unit.
  const apptTime = greetAppointmentTime(greet);
  const hasApptRibbon = apptTime != null;
  const roughCheckin = hasCheckinFeedback(greet) && greet.checkin_rating === 'rough';
  // An OPEN leave request outranks everything: the guest is walking out right
  // now, so it sits topmost and everything below squares its top-right corner.
  const leaveOpen = !!greet.leave_requested_at && !greet.leave_resolved_at;
  const bannerBelowRibbon = prepNeeded || roughCheckin || leaveOpen;

  // Classification drives the card's left border + faint background tint.
  // (Classification wins the border; promote-up is shown via its pill, not the
  // border.) Falls back to the prior purple / promoted-amber when the
  // classification value is unknown.
  const cls = classificationBadge(greet.service_classification);
  const cardBorderColor = cls ? cls.cardBorder : (promoted ? '#f59e0b' : '#9b59b6');
  const cardBg = cls ? cls.cardTint : 'white';

  // In edit mode: clicking the card toggles selection (instead of opening
  // detail). When a card is selected, a thicker purple ring and slight tint
  // make the selection unmistakable.
  const handleCardClick = () => {
    if (editMode) {
      onToggleSelect && onToggleSelect();
    } else {
      onOpen && onOpen();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(155, 89, 182, 0.25)'}
      onMouseOut={(e) => e.currentTarget.style.boxShadow = selected
        ? '0 0 0 3px rgba(155, 89, 182, 0.55), 0 2px 6px rgba(0,0,0,0.06)'
        : '0 2px 6px rgba(0,0,0,0.06)'}
      style={{
        backgroundColor: cardBg,
        border: '1px solid #eee',
        borderLeft: `4px solid ${cardBorderColor}`,
        borderRadius: '10px',
        padding: '16px 18px',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 3px rgba(155, 89, 182, 0.55), 0 2px 6px rgba(0,0,0,0.06)'
          : '0 2px 6px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Edit-mode checkbox indicator — top-left of card, above content. */}
      {editMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          border: selected ? '2px solid #9b59b6' : '2px solid #cbd5e1',
          backgroundColor: selected ? '#9b59b6' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '700',
          zIndex: 2,
          pointerEvents: 'none',
        }}>
          {selected ? '✓' : ''}
        </div>
      )}
      {/* Appointment ribbon — a checkered "racing flag" strip across the top,
          shown only for booked guests so they read from across the room. Full
          bleed via negative margins (same technique as the banners below).
          Topmost element, so it owns the top-right corner rounding; if a loud
          banner (engine prep / rough check-in) follows, it sits flush above it
          with no bottom margin. The exact time still rides the pill below. */}
      {hasApptRibbon && (
        <div
          title={`Appointment: ${apptTime}`}
          style={{
            margin: bannerBelowRibbon ? '-16px -18px 0 -18px' : '-16px -18px 12px -18px',
            height: '14px',
            backgroundImage: 'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%)',
            backgroundSize: '14px 14px',
            borderTopRightRadius: '9px',
            // Top-left stays square: the 4px classification border sits flush,
            // matching the banner treatment below.
          }}
        />
      )}
      {/* Engine Prep banner — only when one of the engine-prep GROW codes is
          present. Sits above everything else and spans edge-to-edge (negative
          margins escape the card's padding) so it can't be missed. The 3-min
          pre-treat window means the CSA needs to grab the bottle BEFORE the
          car pulls in, so this banner has to read from across the room. */}
      {/* Guest asked to LEAVE and nobody has closed it out. Topmost banner —
          the only one where the guest is mid-exit. Carries the resolve buttons,
          because whoever walks over should record what happened, and
          leave_outcome is the only retention measurement this flow produces. */}
      {leaveOpen && (
        <div style={{
          margin: hasApptRibbon ? '0 -18px 12px -18px' : '-16px -18px 12px -18px',
          backgroundColor: '#7f1d1d',
          color: 'white',
          padding: '10px 14px',
          borderTopRightRadius: hasApptRibbon ? '0' : '9px',
          boxShadow: 'inset 0 0 0 2px #fecaca',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
              🚨 WANTS TO LEAVE — {leaveReasonLabel(greet.leave_reason)}
            </span>
            <span style={{ fontSize: '11px', opacity: 0.9 }}>
              {leaveWaitingMinutes(greet)}m ago
            </span>
          </div>
          {greet.leave_comment && greet.leave_comment.trim() && (
            <div style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.95 }}>
              "{greet.leave_comment.trim()}"
            </div>
          )}
          {greet.recovery_code && (
            <div style={{ fontSize: '12px' }}>
              Auto-offered ${Math.round(Number(greet.recovery_amount))} off ({greet.recovery_code})
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResolveLeave && onResolveLeave(greet, 'stayed'); }}
              style={{
                fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '6px',
                border: 'none', cursor: 'pointer', backgroundColor: '#16a34a', color: 'white',
              }}
            >
              They stayed
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResolveLeave && onResolveLeave(greet, 'left'); }}
              style={{
                fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '6px',
                border: '1px solid #fecaca', cursor: 'pointer', backgroundColor: 'transparent', color: 'white',
              }}
            >
              They left
            </button>
          </div>
        </div>
      )}

      {prepNeeded && (
        <div style={{
          margin: (hasApptRibbon || leaveOpen) ? '0 -18px 12px -18px' : '-16px -18px 12px -18px',
          // Safety / construction-sign yellow. The Engine Prep bottle is a
          // black silhouette, so this color gives maximum contrast — the
          // bottle reads crisply at the small card size. (Earlier dark-navy
          // attempt blended the bottle into the background.)
          backgroundColor: '#facc15',
          color: '#111827',
          padding: '10px 14px',
          borderTopRightRadius: (hasApptRibbon || leaveOpen) ? '0' : '9px',
          // borderTopLeftRadius intentionally not rounded — the card's 4px
          // classification border sits flush to the banner on the left.
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <img
            src="/images/engine_prep_bottle_64.png"
            srcSet="/images/engine_prep_bottle_64.png 1x, /images/engine_prep_bottle_128.png 2x"
            alt="Engine Prep bottle"
            style={{
              height: '52px',
              width: 'auto',
              flexShrink: 0,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '800',
              letterSpacing: '0.5px',
              lineHeight: '1.15',
              color: '#111827',
            }}>
              ENGINE PREP — POUR BEFORE PULL-IN
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.8px',
              color: '#111827',
              textTransform: 'uppercase',
            }}>
              ⏱ 3-min pre-treat
            </div>
          </div>
        </div>
      )}

      {/* Needs-apology banner — a 'rough' check-in rating means the guest left
          the kiosk unhappy. Loud red so a manager can catch them in person
          before they pay. Sits under the Engine Prep banner when both fire.
          Display-only; feedback is written by the kiosk. */}
      {hasCheckinFeedback(greet) && greet.checkin_rating === 'rough' && (() => {
        const urgent = checkinIsUrgent(greet);
        return (
        <div style={{
          margin: (prepNeeded || hasApptRibbon || leaveOpen) ? '0 -18px 12px -18px' : '-16px -18px 12px -18px',
          backgroundColor: urgent ? '#7f1d1d' : '#dc2626',
          color: 'white',
          padding: '10px 14px',
          borderTopRightRadius: (prepNeeded || hasApptRibbon || leaveOpen) ? '0' : '9px',
          boxShadow: urgent ? 'inset 0 0 0 2px #fecaca' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px' }}>
              ⚠ {urgent ? 'URGENT — APOLOGIZE NOW' : 'NEEDS APOLOGY — ROUGH CHECK-IN'}
            </span>
            {urgent && (
              <span style={{
                fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
                backgroundColor: '#fee2e2', color: '#7f1d1d',
                border: '1px solid #fecaca', borderRadius: '999px', padding: '1px 8px',
              }}>
                HIGH SEVERITY
              </span>
            )}
          </div>
          {(checkinReasonLabels(greet).length > 0 || (greet.checkin_comment && greet.checkin_comment.trim())) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              {checkinReasonLabels(greet).length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '600', lineHeight: '1.35', opacity: 0.95 }}>
                  {checkinReasonLabels(greet).join(' · ')}
                </span>
              )}
              {greet.checkin_comment && greet.checkin_comment.trim() && (
                <CheckinCommentMarker onDark />
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* Top row: short code + customer + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#9b59b6', letterSpacing: '1px' }}>
            #{greet.short_code}
          </span>
          {greet.status === 'in_progress' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              border: '2px solid #3B82F6',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.5px',
            }}>
              ● IN PROGRESS
            </span>
          )}
          {/* Guest-entered promo code. 'other_service' means the guest is
              holding a REAL coupon for work they have NOT booked (brakes,
              tires) -- a lead for the advisor, surfaced quietly. */}
          {greet.promo_status === 'applied' && greet.promo_code && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              backgroundColor: '#DCFCE7', color: '#166534',
              border: '2px solid #22C55E', padding: '2px 10px',
              borderRadius: '999px', fontSize: '11px', fontWeight: '800',
              letterSpacing: '0.5px',
            }}>
              🏷 {greet.promo_code}
              {greet.promo_savings_estimate != null && ` −$${Number(greet.promo_savings_estimate).toFixed(0)}`}
            </span>
          )}
          {greet.promo_status === 'other_service' && (
            <span
              title={greet.promo_description || undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                backgroundColor: '#FEF3C7', color: '#92400E',
                border: '2px solid #F59E0B', padding: '2px 10px',
                borderRadius: '999px', fontSize: '11px', fontWeight: '800',
                letterSpacing: '0.5px',
              }}
            >
              🏷 HAS COUPON: {promoShortLabel(greet.promo_description)}
            </span>
          )}
          {greet.is_demo === true && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '2px solid #F59E0B',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.5px',
            }}>
              ⚠ DEMO
            </span>
          )}
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            {greetFullName(greet)}
          </span>
          {greet.customer_phone && (
            <span style={{ fontSize: '13px', color: '#666' }}>
              · {formatPhone(greet.customer_phone)}
            </span>
          )}
          {greet.language === 'es' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              border: '1px solid #93C5FD',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.3px',
            }}>
              🇲🇽 ES
            </span>
          )}
          {themeChip(greet.theme) && (() => {
            const t = themeChip(greet.theme);
            return (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: t.bg,
                color: t.color,
                border: `1px solid ${t.border}`,
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.3px',
              }}>
                {t.icon} {t.label}
              </span>
            );
          })()}
        </div>
        {/* Time cluster, top-right. The bay estimate belongs HERE with the other
            clocks rather than down in the badge row — it is time information, and
            splitting it away from the submit/elapsed pair made it read as just
            another status pill. */}
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {/* SUBMIT time, not created_at. Under progressive save created_at is
                when the guest STARTED the kiosk — several minutes earlier, and the
                wrong clock for "how long has this person been waiting". Falls back
                only for rows predating submitted_at (migration 0034). */}
            {timePacific(greet.submitted_at || greet.created_at)} · {timeAgo(greet.submitted_at || greet.created_at)}
          </span>
          {greet.promised_bay_min_minutes != null && greet.promised_bay_max_minutes != null && (
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#4338ca', marginTop: '2px' }}>
              🔧 Bay {greet.promised_bay_min_minutes}–{greet.promised_bay_max_minutes} min
            </div>
          )}
        </div>
      </div>

      {/* Vehicle line */}
      <div style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>
        {greet.vehicle_display || 'Vehicle unknown'}
        {greet.vehicle_mileage != null && (
          <span style={{ color: '#888' }}> · <InlineCopy
            display={`${greet.vehicle_mileage.toLocaleString()} mi`}
            copyValue={String(greet.vehicle_mileage)}
            title="Tap to copy mileage"
          /></span>
        )}
        {greet.is_returning_vehicle && (
          <span style={{
            marginLeft: '8px',
            fontSize: '10px',
            color: '#065f46',
            backgroundColor: '#d1fae5',
            padding: '2px 6px',
            borderRadius: '8px',
            fontWeight: '600',
          }}>
            RETURNING
          </span>
        )}
        {greet.is_fleet_vehicle && (
          <span style={{
            marginLeft: '6px',
            fontSize: '10px',
            color: '#1e40af',
            backgroundColor: '#dbeafe',
            padding: '2px 6px',
            borderRadius: '8px',
            fontWeight: '600',
          }}>
            FLEET
          </span>
        )}
      </div>

      {/* Classification badge + wait preference — paired on one row so the CSA
          sees urgency/scope and where the customer is together at a glance. */}
      {(greetAppointmentTime(greet) || classificationBadge(greet.service_classification) || waitPreferenceChip(greet.wait_preference)) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
          {/* Appointment pill — booked guest. Placed first so scheduled
              customers stand out from walk-ins at a glance. Stronger indigo
              than the wait-preference chip so the two don't read as the same
              thing. Shows the kiosk's exact time string. */}
          {greetAppointmentTime(greet) && (
            <span style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.3px',
              color: '#3730a3',
              backgroundColor: '#e0e7ff',
              border: '2px solid #818cf8',
              padding: '3px 12px',
              borderRadius: '8px',
            }}>
              📅 Appt: {greetAppointmentTime(greet)}
            </span>
          )}
          {classificationBadge(greet.service_classification) && (() => {
            const b = classificationBadge(greet.service_classification);
            return (
              <span style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                color: b.color,
                backgroundColor: b.bg,
                border: `2px solid ${b.border}`,
                padding: '3px 12px',
                borderRadius: '8px',
              }}>
                {b.icon} {b.label}
              </span>
            );
          })()}
          {waitPreferenceChip(greet.wait_preference) && (() => {
            const w = waitPreferenceChip(greet.wait_preference);
            return (
              <span style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.3px',
                color: '#3730a3',
                backgroundColor: '#eef2ff',
                border: '2px solid #c7d2fe',
                padding: '3px 12px',
                borderRadius: '8px',
              }}>
                {w.icon} {w.label}
              </span>
            );
          })()}
        </div>
      )}

      {/* Vehicle identifiers — click-to-copy plate + full VIN, for fast paste
          into Turbo / parts lookups without opening the modal. */}
      {(greet.vehicle_license_plate || greet.vehicle_vin) && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
          {greet.vehicle_license_plate && (
            <CopyChip
              label="PLATE"
              value={`${greet.vehicle_license_plate}${greet.vehicle_license_state ? ' (' + greet.vehicle_license_state + ')' : ''}`}
              copyValue={greet.vehicle_license_plate}
            />
          )}
          {greet.vehicle_vin && (
            <CopyChip label="VIN" value={greet.vehicle_vin} />
          )}
        </div>
      )}

      {/* Service summary */}
      <div style={{ fontSize: '13px', color: '#444', marginBottom: '6px' }}>
        {oilTierLabel(greet.oil_tier_selected) || 'No oil service'}
        {greet.oil_tier_needs_confirmation === true && (
          <span style={{
            display: 'inline-block',
            marginLeft: '8px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FCD34D',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.3px',
            verticalAlign: 'middle',
          }}>
            ⚠ CONFIRM OIL
          </span>
        )}
        {/* Oil-capacity flag — distinct from the tier pill above. Fires when
            the kiosk couldn't determine oil capacity, so the shown price is
            the base (5-qt) fill and may be low. Sky-blue vs. the amber tier
            pill so the two confirmations don't blur — one is "which oil," this
            is "how many quarts." Dormant until the kiosk emits the flag. */}
        {greet.oil_capacity_unknown === true && (
          <span style={{
            display: 'inline-block',
            marginLeft: '8px',
            backgroundColor: '#E0F2FE',
            color: '#075985',
            border: '1px solid #7DD3FC',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.3px',
            verticalAlign: 'middle',
          }}>
            🛢️ CONFIRM QUARTS
          </span>
        )}
        {greet.tm_package_selected && !tmRemoved(greet) && (
          <> + {tmPackageLabel(greet.tm_package_selected)}</>
        )}
        {greet.estimated_subtotal != null && (
          <span style={{ fontWeight: '600', color: '#333' }}>
            {' '}· {formatCurrency(Number(greet.estimated_subtotal))}
          </span>
        )}
      </div>

      {/* GROW codes — actual click-to-copy chips, so the greeter can grab a
          code straight from the list without opening the modal. */}
      {Array.isArray(greet.grow_codes) && greet.grow_codes.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
          {greet.grow_codes.map((code, idx) => (
            <GrowCodeChip key={`${code}-${idx}`} code={code} size="compact" />
          ))}
        </div>
      )}

      {/* Recovery voucher — the cashier's copy of the check-in make-good code.
          Independent of rating; driven by recovery_code so it shows even if the
          guest forgot to show their phone. */}
      {greet.recovery_code && (
        <div style={{ marginBottom: '8px' }}>
          <RecoveryVoucherChip greet={greet} size="compact" />
        </div>
      )}

      {/* Promote-up + concerns row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Check-in feedback flag — okay (amber) / great (green). rough is
            handled by its own loud banner above, so it's excluded here. */}
        {hasCheckinFeedback(greet) && (greet.checkin_rating === 'okay' || greet.checkin_rating === 'great') && (() => {
          const s = checkinRatingStyle(greet.checkin_rating);
          const hasComment = greet.checkin_comment && greet.checkin_comment.trim();
          return (
            <>
              <span style={{
                fontSize: '11px', fontWeight: '700',
                color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`,
                padding: '3px 8px', borderRadius: '10px',
              }}>
                {s.icon} Check-in: {checkinRatingLabel(greet.checkin_rating)}
              </span>
              {hasComment && <CheckinCommentMarker />}
            </>
          );
        })()}
        {alerts.length > 0 && (
          <span style={{
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#111827',
            border: '1px solid #111827',
            padding: '3px 10px',
            borderRadius: '10px',
            fontWeight: '800',
            letterSpacing: '0.3px',
          }}>
            ⚠ CONTACT UPDATED
          </span>
        )}
        {promoted && (
          <span style={{
            fontSize: '11px',
            color: '#92400e',
            backgroundColor: '#fef3c7',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '600',
          }}>
            ⚠ Promoted to Full
          </span>
        )}
        {hasConcerns && !promoted && (
          <span style={{
            fontSize: '11px',
            color: '#92400e',
            backgroundColor: '#fef3c7',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '600',
          }}>
            Has concerns flagged
          </span>
        )}
        {greet.follow_up_response === 'accepted' && (
          <span style={{
            fontSize: '11px',
            color: '#065f46',
            backgroundColor: '#d1fae5',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '600',
          }}>
            ✓ Accepted CAW
          </span>
        )}
        {/* Quote-exists badges (Phase 2): a quote of this type has been
            generated from this greet. Factual record of a CSA action, not a
            prediction of need. */}
        {greet.has_tire_quote && (
          <span style={{
            fontSize: '11px',
            color: '#5b21b6',
            backgroundColor: '#ede9fe',
            border: '1px solid #c4b5fd',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '700',
          }}>
            🛞 Tire quote{greet.tire_quote_count > 1 ? ` ×${greet.tire_quote_count}` : ''}
          </span>
        )}
        {greet.has_mechanical_quote && (
          <span style={{
            fontSize: '11px',
            color: '#1e293b',
            backgroundColor: '#e2e8f0',
            border: '1px solid #94a3b8',
            padding: '3px 8px',
            borderRadius: '10px',
            fontWeight: '700',
          }}>
            🔧 Mech quote{greet.mechanical_quote_count > 1 ? ` ×${greet.mechanical_quote_count}` : ''}
          </span>
        )}
      </div>

      {/* Start-a-quote actions. Hidden in edit (multi-select) mode. Each button
          stops propagation so it launches the quote instead of opening the
          detail modal. */}
      {!editMode && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
          <GreetQuoteButton kind="tire" onClick={() => startQuoteFromGreet(greet, 'tire')} />
          <GreetQuoteButton kind="mechanical" onClick={() => startQuoteFromGreet(greet, 'mechanical')} />
        </div>
      )}
    </div>
  );
}

// Start-a-quote button used on the greet card and in the detail modal.
// tire → purple (consumer tire theme), mechanical → slate (MechanicalFinder).
function GreetQuoteButton({ kind, onClick }) {
  const tire = kind === 'tire';
  return (
    <button
      onClick={onClick}
      onMouseOver={(e) => { e.currentTarget.style.opacity = '0.88'; }}
      onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
      style={{
        flex: 1,
        padding: '9px 12px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.3px',
        color: '#ffffff',
        backgroundColor: tire ? '#9b59b6' : '#334155',
        transition: 'opacity 0.15s',
      }}
    >
      {tire ? '🛞 Start Tire Quote' : '🔧 Start Mechanical Quote'}
    </button>
  );
}

// =============================================================================
// GreetDetailModal — full-screen overlay with the greet's complete breakdown
// =============================================================================
function GreetDetailModal({ greet, onClose, loading }) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const promoted = greet.classification_promoted === true;

  // Build the promote-up sentence using actual concern labels when possible.
  const buildPromoteUpSentence = () => {
    if (!promoted) return null;

    const reason = greet.promoted_reason;
    const chips = Array.isArray(greet.concerns_selected) ? greet.concerns_selected : [];

    if (reason === 'concern_chip_selected' && chips.length > 0) {
      const labels = chips.map(concernLabel);
      const list = labels.length === 1
        ? labels[0]
        : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
      return `Customer mentioned ${list}. We promised we'd take extra time today to look these over properly.`;
    }

    if (reason === 'concern_text_provided' && greet.concerns_text) {
      return `Customer described concerns in their own words. We promised we'd take extra time today to look them over properly.`;
    }

    if (reason === 'customer_chose_full_on_screen_5') {
      return `Customer chose a full inspection up front — they know they want the thorough look-over.`;
    }

    return promotedReasonLabel(reason);
  };

  const promoteSentence = buildPromoteUpSentence();
  const concerns = Array.isArray(greet.concerns_selected) ? greet.concerns_selected : [];
  const followUpItems = Array.isArray(greet.follow_up_items_accepted) ? greet.follow_up_items_accepted : [];

  // Contact-change alerts, keyed by field so each renders under its own row.
  const modalAlerts = contactAlerts(greet).reduce((acc, a) => {
    acc[a.field] = a.detail;
    return acc;
  }, {});

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          maxWidth: '720px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#9b59b6',
          color: 'white',
          padding: '20px 25px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              #{greet.short_code}
              {greet.is_demo === true && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '2px solid #F59E0B',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                }}>
                  ⚠ DEMO — NOT A REAL CUSTOMER
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
              Submitted {timePacific(greet.submitted_at || greet.created_at)} · {timeAgo(greet.submitted_at || greet.created_at)} · {timePressureLabel(greet.time_pressure)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            CLOSE ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '25px' }}>
          {/* Start-a-quote actions — pre-fill the destination tool with this
              greet's customer + plate. Close the modal first so the CSA isn't
              left with a stale overlay if they navigate back. */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <GreetQuoteButton kind="tire" onClick={() => { onClose && onClose(); startQuoteFromGreet(greet, 'tire'); }} />
            <GreetQuoteButton kind="mechanical" onClick={() => { onClose && onClose(); startQuoteFromGreet(greet, 'mechanical'); }} />
          </div>

          {loading && (
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', textAlign: 'right' }}>
              Refreshing...
            </div>
          )}

          {/* Promote-up callout */}
          {promoted && promoteSentence && (
            <div style={{
              backgroundColor: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              color: '#78350f',
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: '1.5',
              fontStyle: 'italic',
            }}>
              <div style={{ fontWeight: '700', fontStyle: 'normal', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>
                ⚠ Promoted from Express to Full Inspection
              </div>
              {promoteSentence}
            </div>
          )}

          {/* Check-in feedback (Screen 15 survey) + recovery voucher.
              Read-only — the kiosk owns all writes. A 'rough' rating gets the
              loud red treatment so a manager catches the guest before checkout;
              the recovery code (if any) rides along for the cashier. */}
          {hasCheckinFeedback(greet) && (() => {
            const s = checkinRatingStyle(greet.checkin_rating) || checkinRatingStyle('okay');
            const reasons = checkinReasonLabels(greet);
            const comment = greet.checkin_comment && greet.checkin_comment.trim();
            const rough = greet.checkin_rating === 'rough';
            const urgent = rough && checkinIsUrgent(greet);
            return (
              <div style={{
                backgroundColor: urgent ? '#7f1d1d' : (rough ? '#dc2626' : s.bg),
                borderLeft: `4px solid ${rough ? '#991b1b' : s.border}`,
                color: rough ? '#ffffff' : s.color,
                padding: '14px 18px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <div style={{
                  fontWeight: '800', textTransform: 'uppercase', fontSize: '11px',
                  letterSpacing: '1px', marginBottom: (reasons.length || comment || greet.recovery_code) ? '10px' : '0',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span>
                    {s.icon} {urgent ? 'Urgent — apologize now' : (rough ? 'Needs apology — rough check-in' : `Check-in feedback — ${checkinRatingLabel(greet.checkin_rating)}`)}
                  </span>
                  {urgent && (
                    <span style={{
                      fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px',
                      backgroundColor: '#fee2e2', color: '#7f1d1d',
                      border: '1px solid #fecaca', borderRadius: '999px', padding: '1px 8px',
                    }}>
                      HIGH SEVERITY
                    </span>
                  )}
                </div>
                {reasons.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: comment ? '10px' : '0' }}>
                    {reasons.map((label, i) => (
                      <span key={i} style={{
                        fontSize: '12px', fontWeight: '600',
                        backgroundColor: rough ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.6)',
                        border: `1px solid ${rough ? 'rgba(255,255,255,0.5)' : s.border}`,
                        borderRadius: '999px', padding: '3px 10px',
                        color: rough ? '#ffffff' : s.color,
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {comment && (
                  <div style={{ fontSize: '13px', fontStyle: 'italic', lineHeight: '1.45' }}>
                    “{comment}”
                  </div>
                )}
                {greet.recovery_code && (
                  <div style={{ marginTop: '12px' }}>
                    <RecoveryVoucherChip greet={greet} size="normal" />
                  </div>
                )}
              </div>
            );
          })()}

          {/* GROW Service Codes — the most actionable info, placed first.
              Display-only: codes and callouts are rendered exactly as stored
              by the kiosk's greets-submit. Never transformed or recomputed. */}
          <GrowCodesSection
            codes={Array.isArray(greet.grow_codes) ? greet.grow_codes : []}
            callouts={Array.isArray(greet.grow_code_callouts) ? greet.grow_code_callouts : []}
          />

          {/* Customer & Vehicle */}
          <Section title="Customer & Vehicle">
            <DetailRow
              label="First Name"
              value={greet.customer_first_name || '—'}
              copyValue={greet.customer_first_name || ''}
            />
            <DetailRow
              label="Last Name"
              value={greet.customer_last_name || '—'}
              copyValue={greet.customer_last_name || ''}
            />
            {modalAlerts.first_name && (
              <ContactAlertRow detail={modalAlerts.first_name} />
            )}
            <DetailRow
              label="Phone"
              value={greet.customer_phone ? formatPhone(greet.customer_phone) : '—'}
              copyValue={greet.customer_phone ? formatPhone(greet.customer_phone) : ''}
            />
            {modalAlerts.phone && (
              <ContactAlertRow detail={modalAlerts.phone} />
            )}
            <DetailRow
              label="Email"
              value={greet.customer_email || '—'}
              copyValue={greet.customer_email || ''}
            />
            {modalAlerts.email && (
              <ContactAlertRow detail={modalAlerts.email} />
            )}
            <DetailRow label="Vehicle" value={greet.vehicle_display || '—'} />
            <DetailRow
              label="Plate"
              value={greet.vehicle_license_plate
                ? `${greet.vehicle_license_plate}${greet.vehicle_license_state ? ' (' + greet.vehicle_license_state + ')' : ''}`
                : '—'}
            />
            <DetailRow label="VIN" value={greet.vehicle_vin || '—'} />
            <DetailRow
              label="Mileage"
              value={greet.vehicle_mileage != null ? `${greet.vehicle_mileage.toLocaleString()} mi` : '—'}
              copyValue={greet.vehicle_mileage != null ? String(greet.vehicle_mileage) : ''}
            />
            {greet.last_visit_date && (
              <DetailRow
                label="Last visit"
                value={`${formatDate(greet.last_visit_date)}${greet.last_visit_mileage != null ? ' @ ' + greet.last_visit_mileage.toLocaleString() + ' mi' : ''}`}
              />
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {greet.is_returning_vehicle && (
                <span style={badgePill('#065f46', '#d1fae5')}>RETURNING</span>
              )}
              {greet.is_fleet_vehicle && (
                <span style={badgePill('#1e40af', '#dbeafe')}>FLEET</span>
              )}
              {themeChip(greet.theme) && (() => {
                const t = themeChip(greet.theme);
                return (
                  <span style={badgePill(t.color, t.bg)}>{t.icon} {t.label}</span>
                );
              })()}
            </div>
          </Section>

          {/* Service Plan */}
          <Section title="Service Plan">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
              <span style={{ color: '#888', flexShrink: 0, fontSize: '13px' }}>Service</span>
              {classificationBadge(greet.service_classification) ? (() => {
                const b = classificationBadge(greet.service_classification);
                return (
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    letterSpacing: '0.5px',
                    color: b.color,
                    backgroundColor: b.bg,
                    border: `2px solid ${b.border}`,
                    padding: '4px 14px',
                    borderRadius: '8px',
                  }}>
                    {b.icon} {b.label}
                  </span>
                );
              })() : (
                <span style={{ color: '#333', fontWeight: '500', fontSize: '13px' }}>
                  {serviceClassificationLabel(greet.service_classification)}
                </span>
              )}
            </div>
            <DetailRow
              label="Customer pace"
              value={timePressureLabel(greet.time_pressure)}
            />
            {/* Appointment — kiosk-detected at check-in. Rendered as a pill so
                a booked guest reads at a glance, consistent with the card. */}
            {greetAppointmentTime(greet) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                <span style={{ color: '#888', flexShrink: 0, fontSize: '13px' }}>Appointment</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  letterSpacing: '0.3px',
                  color: '#3730a3',
                  backgroundColor: '#e0e7ff',
                  border: '2px solid #818cf8',
                  padding: '3px 12px',
                  borderRadius: '8px',
                }}>
                  📅 {greetAppointmentTime(greet)}
                </span>
              </div>
            )}
          </Section>

          {/* Oil + Treatment */}
          <Section title="Oil + Treatment">
            <DetailRow label="Oil tier" value={oilTierLabel(greet.oil_tier_selected)} />
            {greet.oil_tier_starts_at != null && (
              <DetailRow
                label="Starting at"
                value={formatCurrency(Number(greet.oil_tier_starts_at))}
              />
            )}
            <DetailRow
              label="Add-on"
              value={
                greet.tm_package_selected && !tmRemoved(greet)
                  ? `${tmPackageLabel(greet.tm_package_selected)} (+${formatCurrency(TM_PACKAGE_ADDON_PRICE[greet.tm_package_selected] || 0)})`
                  : 'No add-on'
              }
            />
            {/* Oil-capacity flag — the kiosk couldn't determine capacity, so
                the "Starting at" price reflects the base fill only and may be
                low. Prompt the CSA to confirm quarts with the guest. Distinct
                from the tier-confirmation flag (which oil vs. how many quarts). */}
            {greet.oil_capacity_unknown === true && (
              <div style={{
                marginTop: '8px',
                backgroundColor: '#E0F2FE',
                border: '1px solid #7DD3FC',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#075985',
                fontWeight: '600',
                lineHeight: '1.4',
              }}>
                🛢️ Oil capacity unknown — confirm quarts with the guest before quoting. The price shown is the base fill and may be low for a larger-capacity engine.
              </div>
            )}
          </Section>

          {/* Tire rotation */}
          <Section title="Tire Rotation">
            <DetailRow
              label="Choice"
              value={rotationRemoved(greet) ? 'No thanks' : tireRotationLabel(greet.tire_rotation_choice)}
            />
            {greet.tire_rotation_choice === 'yes' && !rotationRemoved(greet) && greet.tire_rotation_starts_at != null && (
              <DetailRow
                label="Starting at"
                value={formatCurrency(Number(greet.tire_rotation_starts_at))}
              />
            )}
          </Section>

          {/* CAW Add-ons */}
          {(followUpItems.length > 0 || greet.follow_up_response) && (
            <Section title="CAW Add-ons">
              <DetailRow
                label="Outcome"
                value={followUpResponseLabel(greet.follow_up_response)}
              />
              {followUpItems.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {followUpItems.map((id) => (
                    <span key={id} style={badgePill('#065f46', '#d1fae5')}>
                      ✓ {followUpItemLabel(id)}
                    </span>
                  ))}
                </div>
              )}
              {greet.follow_up_bundle_price != null && (
                <DetailRow
                  label="Bundle price"
                  value={formatCurrency(Number(greet.follow_up_bundle_price))}
                />
              )}
            </Section>
          )}

          {/* Concerns */}
          {(concerns.length > 0 || (greet.concerns_text && greet.concerns_text.trim())) && (
            <Section title="Concerns">
              {concerns.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: greet.concerns_text ? '12px' : '0' }}>
                  {concerns.map((id) => (
                    <span key={id} style={badgePill('#991b1b', '#fee2e2')}>
                      {concernLabel(id)}
                    </span>
                  ))}
                </div>
              )}
              {greet.concerns_text && greet.concerns_text.trim() && (
                <div style={{
                  fontStyle: 'italic',
                  color: '#444',
                  fontSize: '13px',
                  padding: '10px 14px',
                  backgroundColor: '#fafafa',
                  borderLeft: '3px solid #ddd',
                  borderRadius: '4px',
                }}>
                  "{greet.concerns_text}"
                </div>
              )}
            </Section>
          )}

          {/* Wait preference */}
          <Section title="Wait Preference">
            <DetailRow
              label="They'll be"
              value={waitPreferenceLabel(greet.wait_preference)}
            />
          </Section>

          {/* Estimated subtotal */}
          {greet.estimated_subtotal != null && (
            <div style={{
              marginTop: '20px',
              padding: '18px 20px',
              backgroundColor: '#f3e8ff',
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b21a8', letterSpacing: '1px' }}>
                ESTIMATED SUBTOTAL (what the customer saw)
              </span>
              <span style={{ fontSize: '22px', fontWeight: '700', color: '#6b21a8' }}>
                {formatCurrency(Number(greet.estimated_subtotal))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Small modal-internal building blocks
// =============================================================================
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#9b59b6',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '10px',
        paddingBottom: '6px',
        borderBottom: '1px solid #eee',
      }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

// DetailRow — label/value row inside the detail modal.
// Opt-in click-to-copy: pass a non-empty `copyValue` and the value becomes a
// tap-to-copy target with the same green "✓ Copied" flash used by CopyChip and
// the GROW code chips. stopPropagation keeps a copy tap from bubbling to the
// modal/card. Rows without `copyValue` render exactly as before (plain span).
function DetailRow({ label, value, copyValue }) {
  const [copied, setCopied] = useState(false);
  const canCopy = copyValue != null && String(copyValue).trim().length > 0;

  const handleCopy = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        const ta = document.createElement('textarea');
        ta.value = copyValue;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) { /* value stays visible to read/copy manually */ }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0', fontSize: '13px' }}>
      <span style={{ color: '#888', flexShrink: 0 }}>{label}</span>
      {canCopy ? (
        <button
          onClick={handleCopy}
          title={`Tap to copy ${label}`}
          style={{
            appearance: 'none',
            background: copied ? '#d1fae5' : 'transparent',
            border: copied ? '1px solid #34d399' : '1px solid transparent',
            borderRadius: '6px',
            padding: '1px 7px',
            margin: '-1px -7px -1px 0',
            fontSize: '13px',
            fontWeight: '500',
            color: copied ? '#065f46' : '#333',
            textAlign: 'right',
            wordBreak: 'break-word',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.12s',
            fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ Copied' : (
            <>
              <span>{value}</span>
              <span style={{ color: '#b39ddb', fontSize: '12px', flexShrink: 0 }} aria-hidden="true">⧉</span>
            </>
          )}
        </button>
      ) : (
        <span style={{ color: '#333', textAlign: 'right', fontWeight: '500', wordBreak: 'break-word' }}>{value}</span>
      )}
    </div>
  );
}

// Inline alert shown directly under a contact DetailRow (name/phone/email)
// when field_verification flags it as new or unverified. Flavor A — flags
// only, no old value.
function ContactAlertRow({ detail }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '2px 0 8px',
      padding: '7px 12px',
      backgroundColor: '#fee2e2',
      border: '1px solid #fca5a5',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#b91c1c',
      fontWeight: '600',
    }}>
      <span style={{ flexShrink: 0 }}>⚠</span>
      <span>{detail}</span>
    </div>
  );
}

function badgePill(color, bgColor) {
  return {
    fontSize: '11px',
    color,
    backgroundColor: bgColor,
    padding: '3px 10px',
    borderRadius: '10px',
    fontWeight: '600',
    display: 'inline-block',
  };
}

// =============================================================================
// GrowCodesSection — the actionable GROW POS codes + read-only callouts.
//
// DISPLAY ONLY. Codes and callouts are rendered exactly as stored by the
// kiosk's greets-submit function (the single source of truth). This component
// never transforms, sorts, dedups, relabels, or recomputes them — doing so
// would risk drift from what's actually stored.
// =============================================================================
function GrowCodesSection({ codes, callouts }) {
  const hasCodes = codes.length > 0;
  const hasCallouts = callouts.length > 0;

  return (
    <Section title="GROW Service Codes">
      {hasCodes ? (
        <>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
            Enter these into GROW. Tap a code to copy it.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {codes.map((code, idx) => (
              <GrowCodeChip key={`${code}-${idx}`} code={code} />
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
          No service codes — non-oil visit
        </div>
      )}

      {/* Callouts: read-only guidance. Clearly secondary so no one mistakes a
          callout for a code to type into GROW. Matches the muted concerns-note
          styling used elsewhere in the modal. */}
      {hasCallouts && (
        <div style={{ marginTop: hasCodes ? '14px' : '12px' }}>
          <div style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Do not type — greeter guidance
          </div>
          {callouts.map((note, idx) => (
            <div
              key={idx}
              style={{
                fontStyle: 'italic',
                color: '#666',
                fontSize: '13px',
                padding: '8px 12px',
                backgroundColor: '#fafafa',
                borderLeft: '3px solid #ddd',
                borderRadius: '4px',
                marginBottom: idx < callouts.length - 1 ? '6px' : '0',
              }}
            >
              {note}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// =============================================================================
// CopyChip — generic click-to-copy chip for vehicle identifiers (plate, VIN).
// Shows a label + monospace value; tapping copies the value (not the label).
// Modeled on GrowCodeChip's copy handling, including the stopPropagation so a
// copy never opens the greet card's detail modal.
function CopyChip({ label, value, copyValue }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const toCopy = copyValue != null ? copyValue : value;
  const handleCopy = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = toCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) { /* value stays visible to read manually */ }
  };
  return (
    <button
      onClick={handleCopy}
      title={`Tap to copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0.3px',
        color: copied ? '#065f46' : '#475569',
        backgroundColor: copied ? '#d1fae5' : '#f1f5f9',
        border: copied ? '1px solid #34d399' : '1px solid #cbd5e1',
        padding: '3px 9px',
        borderRadius: '7px',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <span style={{ fontFamily: 'inherit', color: '#94a3b8', fontWeight: '700' }}>{label}</span>
      {copied ? '✓ Copied' : value}
    </button>
  );
}

// GrowCodeChip — a single prominent, click-to-copy GROW code.
// =============================================================================
// InlineCopy — small click-to-copy for a value that lives inside a line of text
// (e.g. mileage in the vehicle line) rather than as a standalone chip. Copies
// `copyValue`, shows the same green "✓ Copied" flash used elsewhere, and stops
// the click from bubbling to a clickable parent (the greet card).
function InlineCopy({ display, copyValue, title }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(copyValue));
      } else {
        const ta = document.createElement('textarea');
        ta.value = String(copyValue);
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      // Value stays visible to copy manually — no error UX needed.
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={title || 'Tap to copy'}
      style={{
        appearance: 'none',
        font: 'inherit',
        background: copied ? '#d1fae5' : 'transparent',
        border: copied ? '1px solid #34d399' : '1px solid transparent',
        borderRadius: '6px',
        padding: '0 5px',
        margin: '0 -3px',
        color: copied ? '#065f46' : 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.12s',
        verticalAlign: 'baseline',
      }}
    >
      {copied ? '✓ Copied' : (
        <>
          <span>{display}</span>
          <span aria-hidden="true" style={{ color: '#b39ddb', fontSize: '11px', flexShrink: 0 }}>⧉</span>
        </>
      )}
    </button>
  );
}

function GrowCodeChip({ code, size = 'normal' }) {
  const [copied, setCopied] = useState(false);

  // Some oil services carry a specialty qualifier prefix in the stored code
  // (e.g. "EURO SSS1", "EURO SSS3"). The "euro" part is NOT a GROW code — the
  // greeter only types the code portion (e.g. "SSS1"). So we split it out: the
  // qualifier renders as a separate, non-copyable label and only the code
  // portion is the click-to-copy target. Codes that merely contain "euro"
  // without a trailing space (e.g. "SSEUROCO") don't match and are untouched.
  const m = typeof code === 'string' ? code.match(/^\s*(euro)\s+(.+?)\s*$/i) : null;
  const prefix = m ? m[1] : null;
  const codePart = m ? m[2] : code;

  const handleCopy = async (e) => {
    // Stop the click from bubbling to a clickable parent (e.g. the greet card,
    // which opens the detail modal). Copying a code should never open the modal.
    if (e && e.stopPropagation) e.stopPropagation();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codePart);
      } else {
        // Fallback for browsers/webviews without the async clipboard API.
        const ta = document.createElement('textarea');
        ta.value = codePart;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      // If copy fails entirely, the code is still visible on the chip to type
      // manually — no error UX needed.
    }
  };

  const compact = size === 'compact';

  const chip = (
    <button
      onClick={handleCopy}
      title="Tap to copy"
      style={{
        fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace",
        fontSize: compact ? '13px' : '16px',
        fontWeight: '700',
        letterSpacing: '0.5px',
        color: copied ? '#065f46' : '#3730a3',
        backgroundColor: copied ? '#d1fae5' : '#e0e7ff',
        border: copied ? '2px solid #34d399' : '2px solid #c7d2fe',
        padding: compact ? '4px 10px' : '8px 16px',
        borderRadius: compact ? '8px' : '10px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        minWidth: compact ? '44px' : '60px',
      }}
    >
      {copied ? (compact ? '✓' : '✓ Copied') : codePart}
    </button>
  );

  if (!prefix) return chip;

  // Qualifier + code as two separate bubbles. The qualifier is a muted,
  // non-copyable label so no one mistakes it for something to type into GROW.
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span
        title="Specialty qualifier — not a GROW code"
        style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: compact ? '11px' : '13px',
          fontWeight: '700',
          letterSpacing: '0.3px',
          textTransform: 'lowercase',
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          padding: compact ? '4px 8px' : '8px 12px',
          borderRadius: compact ? '8px' : '10px',
        }}
      >
        {prefix}
      </span>
      {chip}
    </span>
  );
}

// =============================================================================
// DeleteGreetsConfirmModal — manager confirms before soft-deleting greets.
//
// Reason is required; the Delete button stays disabled until a reason is
// picked. Cancel and ESC close the modal unless a delete is in progress
// (don't strand the user with an in-flight call they can't see).
// =============================================================================
function DeleteGreetsConfirmModal({ count, reason, onReasonChange, onCancel, onConfirm, inProgress, error }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !inProgress) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, inProgress]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const REASONS = [
    { value: 'test',          label: 'Test record (created during system testing)' },
    { value: 'duplicate',     label: 'Duplicate submission' },
    { value: 'customer_left', label: 'Customer left without service' },
    { value: 'system_error',  label: 'System error / glitch' },
    { value: 'other',         label: 'Other' },
  ];

  const canConfirm = Boolean(reason) && count > 0 && !inProgress;

  return (
    <div
      onClick={inProgress ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header — red so the destructive action is unmistakable */}
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '18px 24px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.3px' }}>
            Delete {count} kiosk record{count !== 1 ? 's' : ''}?
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
            This can be undone by an admin. Records are hidden from the dashboard but kept for audit.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
            REASON (REQUIRED)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
            {REASONS.map((r) => (
              <label
                key={r.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: reason === r.value ? '2px solid #9b59b6' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: inProgress ? 'not-allowed' : 'pointer',
                  backgroundColor: reason === r.value ? '#faf5ff' : 'white',
                  fontSize: '13px',
                  fontWeight: reason === r.value ? '600' : '500',
                  color: '#333',
                }}
              >
                <input
                  type="radio"
                  name="delete_reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => onReasonChange(r.value)}
                  disabled={inProgress}
                  style={{ accentColor: '#9b59b6', width: '16px', height: '16px' }}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              disabled={inProgress}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: inProgress ? 'not-allowed' : 'pointer',
                opacity: inProgress ? 0.7 : 1,
              }}
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              style={{
                backgroundColor: canConfirm ? '#dc2626' : '#fca5a5',
                color: 'white',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
              }}
            >
              {inProgress ? 'DELETING…' : `DELETE ${count} RECORD${count !== 1 ? 'S' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DeleteQuotesConfirmModal — manager confirms before voiding tire quotes.
//
// Mirrors DeleteGreetsConfirmModal. Reason is required; the Void button stays
// disabled until a reason is picked. Voided quotes disappear fully from search,
// reports, and customer links — reversible only by an admin. Paid quotes are
// blocked by the backend (surfaced here via the error prop).
// =============================================================================
function DeleteQuotesConfirmModal({ count, reason, onReasonChange, onCancel, onConfirm, inProgress, error }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !inProgress) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, inProgress]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const REASONS = [
    { value: 'test',          label: 'Test quote (created during system testing)' },
    { value: 'duplicate',     label: 'Duplicate quote' },
    { value: 'customer_left', label: 'Customer left without purchasing' },
    { value: 'system_error',  label: 'System error / glitch' },
    { value: 'other',         label: 'Other' },
  ];

  const canConfirm = Boolean(reason) && count > 0 && !inProgress;

  return (
    <div
      onClick={inProgress ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header — red so the destructive action is unmistakable */}
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '18px 24px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.3px' }}>
            Void {count} quote{count !== 1 ? 's' : ''}?
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
            Voided quotes disappear from search, reports, and customer links. The record is kept for audit and can only be restored by an admin. Paid quotes can't be voided.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>
            REASON (REQUIRED)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
            {REASONS.map((r) => (
              <label
                key={r.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: reason === r.value ? '2px solid #9b59b6' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: inProgress ? 'not-allowed' : 'pointer',
                  backgroundColor: reason === r.value ? '#faf5ff' : 'white',
                  fontSize: '13px',
                  fontWeight: reason === r.value ? '600' : '500',
                  color: '#333',
                }}
              >
                <input
                  type="radio"
                  name="quote_void_reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => onReasonChange(r.value)}
                  disabled={inProgress}
                  style={{ accentColor: '#9b59b6', width: '16px', height: '16px' }}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              disabled={inProgress}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: inProgress ? 'not-allowed' : 'pointer',
                opacity: inProgress ? 0.7 : 1,
              }}
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              style={{
                backgroundColor: canConfirm ? '#dc2626' : '#fca5a5',
                color: 'white',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                cursor: canConfirm ? 'pointer' : 'not-allowed',
              }}
            >
              {inProgress ? 'VOIDING…' : `VOID ${count} QUOTE${count !== 1 ? 'S' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
