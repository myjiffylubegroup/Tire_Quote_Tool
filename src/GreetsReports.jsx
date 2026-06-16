import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { apiCall } from './apiClient';

import { API_BASE } from './config';

const STORES = [
  { id: 609,  name: 'Santa Maria',                 number: 609  },
  { id: 1002, name: 'San Luis Obispo',             number: 1002 },
  { id: 1257, name: 'Goleta',                      number: 1257 },
  { id: 1270, name: 'Arroyo Grande',               number: 1270 },
  { id: 1396, name: 'Santa Barbara (Downtown)',    number: 1396 },
  { id: 1932, name: 'Atascadero',                  number: 1932 },
  { id: 2911, name: 'Paso Robles',                 number: 2911 },
  { id: 4182, name: 'Santa Barbara (Upper State)', number: 4182 },
];

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

const formatPct = (v) =>
  v === null || v === undefined ? '—' : `${v}%`;

const formatNum = (v) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString();

const todayPacific = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

// Date presets — mirrors Reports.jsx exactly so the two pages feel identical.
const getPreset = (preset) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = todayPacific();

  if (preset === 'today')      return { from: today, to: today };
  if (preset === 'this_week') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return { from: fmt(d), to: today };
  }
  if (preset === 'this_month') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return { from: `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`, to: today };
  }
  if (preset === 'last_month') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const last  = new Date(d.getFullYear(), d.getMonth(), 0);
    return { from: fmt(first), to: fmt(last) };
  }
  if (preset === 'last_30') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    d.setDate(d.getDate() - 29);
    return { from: fmt(d), to: today };
  }
  if (preset === 'last_90') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    d.setDate(d.getDate() - 89);
    return { from: fmt(d), to: today };
  }
  return { from: today, to: today };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

// Same KpiCard contract as Reports.jsx — copied so this page has no
// hidden dependency on the other. When `onClick` is supplied the card
// becomes interactive (hover state, pointer cursor, tiny "→" cue).
const KpiCard = ({ label, value, sub, color = '#9b59b6', highlight = false, onClick }) => {
  const isClickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: highlight ? color : 'white',
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '18px 22px',
        textAlign: 'center',
        flex: '1 1 140px',
        minWidth: '130px',
        cursor: isClickable ? 'pointer' : 'default',
        position: 'relative',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseOver={isClickable ? (e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 6px 16px ${color}40`;
      } : undefined}
      onMouseOut={isClickable ? (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      } : undefined}
    >
      {isClickable && (
        <div style={{
          position: 'absolute', top: '8px', right: '10px',
          fontSize: '10px', color: highlight ? 'rgba(255,255,255,0.6)' : '#bbb',
          fontWeight: '700',
        }}>↗</div>
      )}
      <div style={{ fontSize: '11px', fontWeight: '700', color: highlight ? 'rgba(255,255,255,0.85)' : '#888', letterSpacing: '1px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: highlight ? 'white' : color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: highlight ? 'rgba(255,255,255,0.75)' : '#aaa', marginTop: '5px' }}>
          {sub}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ children, tooltip }) => (
  <h3 style={{
    fontSize: '13px', fontWeight: '700', color: '#9b59b6',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    borderBottom: '2px solid #f3e8ff', paddingBottom: '8px',
    marginBottom: '16px', marginTop: '0',
    display: 'flex', alignItems: 'center', gap: '8px',
  }}>
    {children}
    {tooltip && (
      <span title={tooltip} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: '#e9d5ff', color: '#7e22ce',
        fontSize: '10px', fontWeight: '700', cursor: 'help',
      }}>?</span>
    )}
  </h3>
);

// Horizontal bar breakdown — one row per segment, ordered by count desc.
// If `onSegmentClick` is supplied each row becomes clickable; the segment's
// `key` is what gets sent (we pass machine-readable keys like 'express',
// 'max_protect', etc. alongside the display labels).
const SegmentBar = ({ segments, total, color = '#9b59b6', onSegmentClick }) => {
  if (!segments || segments.length === 0 || !total) {
    return <div style={{ fontSize: '12px', color: '#aaa' }}>No data</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {segments.map((seg) => {
        const pct = total > 0 ? (seg.count / total) * 100 : 0;
        const isClickable = typeof onSegmentClick === 'function' && seg.key != null && seg.count > 0;
        return (
          <div
            key={seg.label}
            onClick={isClickable ? () => onSegmentClick(seg.key) : undefined}
            style={{
              cursor: isClickable ? 'pointer' : 'default',
              padding: isClickable ? '2px 4px' : '0',
              margin: isClickable ? '-2px -4px' : '0',
              borderRadius: isClickable ? '4px' : '0',
              transition: 'background-color 0.1s',
            }}
            onMouseOver={isClickable ? (e) => e.currentTarget.style.backgroundColor = '#faf5ff' : undefined}
            onMouseOut={isClickable ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
              <span style={{ color: '#555', fontWeight: '500' }}>{seg.label}</span>
              <span style={{ color: '#888' }}>
                {seg.count} · {Math.round(pct)}%
              </span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f3e8ff', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                backgroundColor: seg.color || color,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BreakdownCard = ({ title, segments, total, color, tooltip, onSegmentClick }) => (
  <div style={{
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '18px 20px',
    flex: '1 1 280px',
    minWidth: '260px',
  }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {title}
      {tooltip && (
        <span title={tooltip} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '14px', height: '14px', borderRadius: '50%',
          backgroundColor: '#f0f0f0', color: '#888',
          fontSize: '9px', fontWeight: '700', cursor: 'help',
        }}>?</span>
      )}
    </div>
    <SegmentBar segments={segments} total={total} color={color} onSegmentClick={onSegmentClick} />
  </div>
);

// Stat row for bay duration — replaces the old percentage-bar BreakdownCard,
// which made bay times look like a count distribution rather than a
// duration comparison. Now each classification's average minutes is the
// primary number, with the n shown as the sub-label. Bar width is
// proportional to minutes, not count.
const BayDurationCard = ({ data, outliers, onSegmentClick }) => {
  const segments = [
    { key: 'express', label: 'EXPRESS', color: '#ef4444', ...data.express },
    { key: 'full',    label: 'FULL',    color: '#10b981', ...data.full },
  ].filter((s) => (s.n || 0) > 0);
  if (segments.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px',
        padding: '18px 20px', flex: '1 1 280px', minWidth: '260px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '1px', marginBottom: '12px' }}>
          AVG BAY DURATION
        </div>
        <div style={{ fontSize: '12px', color: '#aaa' }}>No bay times available</div>
      </div>
    );
  }
  // Scale bars to the maximum avg across the segments so the visualization
  // compares minutes directly.
  const maxMin = Math.max(...segments.map((s) => s.avg_minutes || 0));
  return (
    <div style={{
      backgroundColor: 'white', border: '1px solid #eee', borderRadius: '12px',
      padding: '18px 20px', flex: '1 1 280px', minWidth: '260px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        AVG BAY DURATION
        <span title={`Outliers excluded: ${outliers}. Bay times outside 2-180 min are dropped.`} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '14px', height: '14px', borderRadius: '50%',
          backgroundColor: '#f0f0f0', color: '#888',
          fontSize: '9px', fontWeight: '700', cursor: 'help',
        }}>?</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {segments.map((s) => {
          const width = maxMin > 0 ? ((s.avg_minutes || 0) / maxMin) * 100 : 0;
          const isClickable = typeof onSegmentClick === 'function';
          return (
            <div
              key={s.key}
              onClick={isClickable ? () => onSegmentClick(s.key) : undefined}
              style={{
                cursor: isClickable ? 'pointer' : 'default',
                padding: isClickable ? '4px 6px' : '0',
                margin: isClickable ? '-4px -6px' : '0',
                borderRadius: isClickable ? '6px' : '0',
                transition: 'background-color 0.1s',
              }}
              onMouseOver={isClickable ? (e) => e.currentTarget.style.backgroundColor = '#faf5ff' : undefined}
              onMouseOut={isClickable ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>{s.label}</span>
                <span style={{ fontSize: '15px', color: s.color, fontWeight: '800' }}>
                  {s.avg_minutes != null ? `${s.avg_minutes} min` : '—'}
                  <span style={{ fontSize: '11px', color: '#888', fontWeight: '500', marginLeft: '6px' }}>
                    n={s.n}
                  </span>
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f3e8ff', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${width}%`, height: '100%',
                  backgroundColor: s.color, transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────

export default function GreetsReports() {
  // Auth — read from localStorage (same pattern as Reports.jsx)
  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; }
  })();
  const isCorporate = !auth.store_id || auth.store_id === 'all';
  const authStoreId = auth.store_id && auth.store_id !== 'all' ? Number(auth.store_id) : null;

  // Date range state (default this_month — per spec)
  const [preset, setPreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState(() => getPreset('this_month').from);
  const [dateTo, setDateTo]     = useState(() => getPreset('this_month').to);
  const [customMode, setCustomMode] = useState(false);

  // Store filter. Corporate users can pick All Stores; single-store users
  // are locked to their store.
  const [storeFilter, setStoreFilter] = useState(isCorporate ? 'all' : authStoreId);

  // Staff profile — needed to know whether the user can view this page at all.
  // The Edge Function enforces this too; the client check is for UX (show a
  // friendly "not authorized" message instead of a raw 403).
  const [profile, setProfile] = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);

  // Report data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drill-down state — { metric, segment, title } when a card or segment
  // was clicked; null when the modal is closed.
  const [drill, setDrill] = useState(null);
  const openDrill = (metric, segment, title) => setDrill({ metric, segment, title });
  const closeDrill = () => setDrill(null);

  // Fetch profile once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiCall(`${API_BASE}/staff-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success && data.profile) setProfile(data.profile);
      } catch {
        // Silent — gate check below handles it
      }
      setProfileChecked(true);
    })();
  }, []);

  // Fetch report when scope changes
  useEffect(() => {
    if (!profileChecked) return;
    if (!profile?.can_delete_greets) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, storeFilter, profileChecked, profile?.can_delete_greets]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall(`${API_BASE}/greets-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeFilter,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      setReportData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers for rendering ──
  const s1 = reportData?.section_1;
  const s2 = reportData?.section_2;
  const s3 = reportData?.section_3;

  const matchRatePct = s2 && s2.total_for_match > 0
    ? Math.round(((s2.match_breakdown.exact_vin + s2.match_breakdown.exact_plate) / s2.total_for_match) * 1000) / 10
    : null;

  // Estimate-vs-actual delta (net, pre-tax — the apples-to-apples comparison)
  const estVsActualDelta = (s2 && s2.avg_kiosk_estimate_matched != null && s2.avg_invoice_net != null)
    ? Math.round((s2.avg_invoice_net - s2.avg_kiosk_estimate_matched) * 100) / 100
    : null;

  // ── Render ──

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Navbar
        currentPage="reports"
        headerRight={
          <div style={{ fontSize: '13px', color: '#888', fontWeight: '600' }}>
            {isCorporate ? 'All Stores — Corporate View' : `Store ${authStoreId} — ${STORES.find(s => s.id === authStoreId)?.name || ''}`}
          </div>
        }
      />

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '30px 20px' }}>

        {/* Reports source pill row */}
        <ReportsTabs active="greets" />

        {/* Title + Date Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1a1a1a' }}>Greets Performance</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
              Kiosk activity · Estimate vs. actual ticket · Bay time · NPS
            </p>
          </div>

          {profile?.can_delete_greets && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              {/* Preset pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {[
                  { key: 'today',      label: 'Today'      },
                  { key: 'this_week',  label: 'This Week'  },
                  { key: 'this_month', label: 'Month to Date' },
                  { key: 'last_month', label: 'Last Month' },
                  { key: 'last_30',    label: 'Last 30 Days'},
                  { key: 'last_90',    label: 'Last 90 Days'},
                ].map((p) => {
                  const active = preset === p.key && !customMode;
                  return (
                    <button
                      key={p.key}
                      onClick={() => {
                        const r = getPreset(p.key);
                        setPreset(p.key);
                        setDateFrom(r.from);
                        setDateTo(r.to);
                        setCustomMode(false);
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        borderRadius: '14px',
                        border: active ? '2px solid #9b59b6' : '2px solid #e5e7eb',
                        backgroundColor: active ? '#9b59b6' : 'white',
                        color: active ? 'white' : '#666',
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom date range + store selector */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCustomMode(true); setPreset(''); }}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <span style={{ color: '#888' }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCustomMode(true); setPreset(''); }}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                {isCorporate && (
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #ddd', marginLeft: '4px' }}
                  >
                    <option value="all">All Stores</option>
                    {STORES.map((s) => (
                      <option key={s.id} value={s.id}>#{s.number} — {s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile gate */}
        {profileChecked && !profile?.can_delete_greets && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '20px 24px', color: '#92400e' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>Not authorized</div>
            <div style={{ fontSize: '13px' }}>
              Greets Reports are visible to managers and select office staff. Talk to your store manager if you need access.
            </div>
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9b59b6', fontSize: '15px', fontWeight: '600' }}>
            Loading report data…
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '16px 20px', color: '#991b1b', marginBottom: '24px' }}>
            Error loading report: {error}
          </div>
        )}

        {!loading && !error && reportData && (
          <>
            {/* ── Section 1 — Activity & service mix ─────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Kiosk Activity</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <KpiCard label="Total Greets"        value={formatNum(s1.total_greets)}       sub={`${dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`}`} />
                <KpiCard label="TM-Eligible Greets"  value={formatNum(s1.tm_eligible_greets)} sub="oil + smog + rideshare paths" color="#3b82f6" />
                <KpiCard label="Avg Kiosk Estimate"  value={s1.avg_kiosk_estimate != null ? formatCurrency(s1.avg_kiosk_estimate) : '—'} sub="oil-change greets, pre-tax" color="#10b981" />
                <KpiCard
                  label="Engine Prep Attach"
                  value={s1.tm_eligible_greets > 0 ? `${Math.round((s1.engine_prep_attach / s1.tm_eligible_greets) * 100)}%` : '—'}
                  sub={`${s1.engine_prep_attach} of ${s1.tm_eligible_greets}`}
                  color="#f59e0b"
                  onClick={() => openDrill('engine_prep_attach', 'attached', 'Engine Prep — Attached')}
                />
              </div>

              {/* TM Retention — Phase 12 redesign, split by audience.
                  Two short rows side by side: the Welcome funnel (first-time
                  eligible — new prospects + customers who've never bought TM)
                  and the Returning funnel (customers the kiosk flagged as
                  prior TM holders). Spec baseline targets: ~30% save rate
                  on both. Welcome volume dominates today; Returning will
                  grow as the redesign rolls out to more stores.
                  Free Engine Prep is shared across both funnels; one card
                  at the end captures the total. */}
              <div style={{ marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#9b59b6', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Welcome Funnel (first-time eligible)
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <KpiCard
                  label="Welcome Pitch Shown"
                  value={formatNum(s1.tm_retention?.welcome?.shown || 0)}
                  sub="initial decliners, welcome-eligible"
                  color="#9b59b6"
                  onClick={s1.tm_retention?.welcome?.shown > 0
                    ? () => openDrill('tm_retention', 'welcome_shown', 'Welcome Retention — Pitch Shown')
                    : undefined}
                />
                <KpiCard
                  label="Welcome Save Rate"
                  value={s1.tm_retention?.welcome?.save_rate_pct != null ? `${s1.tm_retention.welcome.save_rate_pct}%` : '—'}
                  sub={s1.tm_retention?.welcome?.shown > 0
                    ? `${s1.tm_retention.welcome.saved} of ${s1.tm_retention.welcome.shown} saved`
                    : 'no pitches shown'}
                  color="#10b981"
                  highlight={s1.tm_retention?.welcome?.save_rate_pct != null && s1.tm_retention.welcome.save_rate_pct >= 30}
                  onClick={s1.tm_retention?.welcome?.saved > 0
                    ? () => openDrill('tm_retention', 'welcome_saved', 'Welcome Retention — Saves')
                    : undefined}
                />
                <KpiCard
                  label="Welcome Missed"
                  value={formatNum(s1.tm_retention?.welcome?.missed || 0)}
                  sub="saw pitch, still declined"
                  color="#ef4444"
                  onClick={s1.tm_retention?.welcome?.missed > 0
                    ? () => openDrill('tm_retention', 'welcome_missed', 'Welcome Retention — Missed')
                    : undefined}
                />
                <KpiCard
                  label="Free Engine Prep Given"
                  value={formatNum(s1.tm_retention?.free_eps_total || 0)}
                  sub="all paths — welcome + retention"
                  color="#f59e0b"
                  onClick={s1.tm_retention?.free_eps_total > 0
                    ? () => openDrill('tm_retention', 'free_eps', 'Free Engine Prep — Given')
                    : undefined}
                />
              </div>

              <div style={{ marginBottom: '6px', fontSize: '11px', fontWeight: '700', color: '#9b59b6', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Returning Funnel (prior TM customers)
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <KpiCard
                  label="Returning Pitch Shown"
                  value={formatNum(s1.tm_retention?.returning?.shown || 0)}
                  sub="initial decliners, prior TM"
                  color="#9b59b6"
                  onClick={s1.tm_retention?.returning?.shown > 0
                    ? () => openDrill('tm_retention', 'returning_shown', 'Returning Retention — Pitch Shown')
                    : undefined}
                />
                <KpiCard
                  label="Returning Save Rate"
                  value={s1.tm_retention?.returning?.save_rate_pct != null ? `${s1.tm_retention.returning.save_rate_pct}%` : '—'}
                  sub={s1.tm_retention?.returning?.shown > 0
                    ? `${s1.tm_retention.returning.saved} of ${s1.tm_retention.returning.shown} saved`
                    : 'no pitches shown'}
                  color="#10b981"
                  highlight={s1.tm_retention?.returning?.save_rate_pct != null && s1.tm_retention.returning.save_rate_pct >= 30}
                  onClick={s1.tm_retention?.returning?.saved > 0
                    ? () => openDrill('tm_retention', 'returning_saved', 'Returning Retention — Saves')
                    : undefined}
                />
                <KpiCard
                  label="Returning Missed"
                  value={formatNum(s1.tm_retention?.returning?.missed || 0)}
                  sub="saw pitch, still declined"
                  color="#ef4444"
                  onClick={s1.tm_retention?.returning?.missed > 0
                    ? () => openDrill('tm_retention', 'returning_missed', 'Returning Retention — Missed')
                    : undefined}
                />
              </div>

              {/* Bars: classification, TM, oil tier, rec acceptance, rotation, wait pref, CAW */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <BreakdownCard
                  title="EXPRESS vs FULL"
                  total={s1.tm_eligible_greets}
                  segments={[
                    { key: 'express', label: 'EXPRESS', count: s1.classification_mix.express, color: '#ef4444' },
                    { key: 'full',    label: 'FULL',    count: s1.classification_mix.full,    color: '#10b981' },
                    ...(s1.classification_mix.other > 0 ? [{ key: null, label: 'Other', count: s1.classification_mix.other, color: '#cbd5e1' }] : []),
                  ]}
                  tooltip="Denominator: TM-eligible greets (oil + smog + rideshare paths)."
                  onSegmentClick={(seg) => openDrill('classification_mix', seg, `${seg.toUpperCase()} — TM-Eligible Greets`)}
                />
                <BreakdownCard
                  title="Oil Tier Selected"
                  total={s1.oil_change_greets}
                  segments={[
                    { key: 'synthetic',         label: 'Synthetic',        count: s1.oil_tier_mix?.synthetic || 0,         color: '#7c3aed' },
                    { key: 'blend',             label: 'Blend',            count: s1.oil_tier_mix?.blend || 0,             color: '#a78bfa' },
                    { key: 'european',          label: 'European',         count: s1.oil_tier_mix?.european || 0,          color: '#3b82f6' },
                    { key: 'diesel_synthetic',  label: 'Diesel Synth',     count: s1.oil_tier_mix?.diesel_synthetic || 0,  color: '#0ea5e9' },
                    ...(s1.oil_tier_mix?.other > 0 ? [{ key: null, label: 'Other', count: s1.oil_tier_mix.other, color: '#cbd5e1' }] : []),
                  ].filter((seg) => seg.count > 0)}
                  tooltip="What customers actually selected for oil tier."
                  onSegmentClick={(seg) => openDrill('oil_tier_mix', seg, `Oil Tier — ${formatOilTier(seg)}`)}
                />
                <BreakdownCard
                  title="Recommendation Acceptance"
                  total={(s1.oil_tier_rec_acceptance?.accepted || 0)
                       + (s1.oil_tier_rec_acceptance?.downgraded || 0)
                       + (s1.oil_tier_rec_acceptance?.upgraded || 0)
                       + (s1.oil_tier_rec_acceptance?.other || 0)}
                  segments={[
                    { key: 'accepted',   label: '✓ Accepted',   count: s1.oil_tier_rec_acceptance?.accepted   || 0, color: '#10b981' },
                    { key: 'downgraded', label: '↓ Downgraded', count: s1.oil_tier_rec_acceptance?.downgraded || 0, color: '#ef4444' },
                    { key: 'upgraded',   label: '↑ Upgraded',   count: s1.oil_tier_rec_acceptance?.upgraded   || 0, color: '#3b82f6' },
                    ...(s1.oil_tier_rec_acceptance?.other > 0 ? [{ key: 'other', label: 'Other',  count: s1.oil_tier_rec_acceptance.other, color: '#cbd5e1' }] : []),
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Customers who took the kiosk's recommended oil tier, vs. those who downgraded or upgraded. 'No rec' greets excluded from the bar."
                  onSegmentClick={(seg) => openDrill('oil_tier_rec_acceptance', seg, `Recommendation — ${formatRecOutcome(seg)}`)}
                />
                <BreakdownCard
                  title="TM Package Attach"
                  total={s1.tm_eligible_greets}
                  segments={[
                    { key: 'max_protect',     label: 'Max Protect',  count: s1.tm_attach.by_tier.max_protect,     color: '#7c3aed' },
                    { key: 'vip',             label: 'VIP',          count: s1.tm_attach.by_tier.vip,             color: '#9b59b6' },
                    { key: 'high_mileage',    label: 'High Mileage', count: s1.tm_attach.by_tier.high_mileage,    color: '#a78bfa' },
                    { key: 'basic_synthetic', label: 'Basic Synth',  count: s1.tm_attach.by_tier.basic_synthetic, color: '#c4b5fd' },
                    { key: 'none',            label: '— None',       count: s1.tm_attach.by_tier.none,            color: '#e5e7eb' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Denominator: TM-eligible greets (oil + smog + rideshare paths)."
                  onSegmentClick={(seg) => openDrill('tm_attach', seg, `TM Package — ${formatTmPackage(seg) === '—' ? 'None' : formatTmPackage(seg)}`)}
                />
                <BreakdownCard
                  title="Tire Rotation"
                  total={s1.tm_eligible_greets}
                  segments={[
                    { key: 'yes',      label: 'Yes',      count: s1.rotation_attach.yes,      color: '#10b981' },
                    { key: 'no',       label: 'No',       count: s1.rotation_attach.no,       color: '#ef4444' },
                    { key: 'not_sure', label: 'Not sure', count: s1.rotation_attach.not_sure, color: '#f59e0b' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Denominator: TM-eligible greets (oil + smog + rideshare paths)."
                  onSegmentClick={(seg) => openDrill('rotation_attach', seg, `Tire Rotation — ${formatRotation(seg)}`)}
                />
                <BreakdownCard
                  title="Wait Preference"
                  total={s1.total_greets}
                  segments={[
                    { key: 'lobby',    label: 'Lobby',    count: s1.wait_preference.lobby,    color: '#3b82f6' },
                    { key: 'in_car',   label: 'In car',   count: s1.wait_preference.in_car,   color: '#f59e0b' },
                    { key: 'drop_off', label: 'Drop off', count: s1.wait_preference.drop_off, color: '#7c3aed' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="All greets (not just oil-change)."
                  onSegmentClick={(seg) => openDrill('wait_preference', seg, `Wait Preference — ${formatWaitPref(seg)}`)}
                />
                <BreakdownCard
                  title="CAW Upsell"
                  total={s1.caw.offered}
                  segments={[
                    { key: 'accepted', label: 'Accepted', count: s1.caw.accepted,                                color: '#10b981' },
                    { key: 'declined', label: 'Declined', count: Math.max(s1.caw.offered - s1.caw.accepted, 0),  color: '#ef4444' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Denominator: greets where CAW was actually offered (returning customers with eligible items). 'Not offered' rows are excluded."
                  onSegmentClick={(seg) => openDrill('caw', seg, `CAW — ${seg === 'accepted' ? 'Accepted' : 'Declined'}`)}
                />
              </div>
            </div>

            {/* ── Section 2 — Performance vs. actual ─────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle tooltip='"Match rate" is the percentage of greets we could tie to a Turbo invoice. The unmatched bucket is mixed — includes timezone misses, no-key greets, wrong-vehicle entries, and possible walk-aways. Treat as directional, not exact.'>
                Performance vs. Actual
              </SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <KpiCard
                  label="Match Rate"
                  value={matchRatePct != null ? `${matchRatePct}%` : '—'}
                  sub={`${(s2.match_breakdown.exact_vin + s2.match_breakdown.exact_plate)} of ${s2.total_for_match} greets`}
                  color="#3b82f6"
                  highlight={matchRatePct != null}
                  onClick={() => openDrill('match_breakdown', null, 'Match Breakdown — All Greets')}
                />
                <KpiCard
                  label="Avg Estimate (matched)"
                  value={s2.avg_kiosk_estimate_matched != null ? formatCurrency(s2.avg_kiosk_estimate_matched) : '—'}
                  sub="pre-tax kiosk estimate"
                  color="#9b59b6"
                />
                <KpiCard
                  label="Avg Invoice Net"
                  value={s2.avg_invoice_net != null ? formatCurrency(s2.avg_invoice_net) : '—'}
                  sub="pre-tax, post-discount"
                  color="#10b981"
                />
                <KpiCard
                  label="Δ vs Estimate"
                  value={estVsActualDelta != null
                    ? `${estVsActualDelta >= 0 ? '+' : ''}${formatCurrency(estVsActualDelta)}`
                    : '—'}
                  sub={estVsActualDelta != null ? (estVsActualDelta >= 0 ? 'actual > estimate' : 'actual < estimate') : ''}
                  color={estVsActualDelta != null && estVsActualDelta >= 0 ? '#10b981' : '#ef4444'}
                  highlight={estVsActualDelta != null}
                  onClick={() => openDrill('delta_vs_estimate', null, 'Δ vs Estimate — Matched Greets')}
                />
                <KpiCard
                  label="Avg Total (paid)"
                  value={s2.avg_invoice_total != null ? formatCurrency(s2.avg_invoice_total) : '—'}
                  sub="post-tax — what customer paid"
                  color="#9b59b6"
                />
                <KpiCard
                  label="Avg Promo Discount"
                  value={s2.avg_promo_discount != null ? formatCurrency(s2.avg_promo_discount) : '—'}
                  sub="across all matched tickets"
                  color="#f59e0b"
                  onClick={() => openDrill('promo_discount', null, 'Discounts — Matched Greets')}
                />
                <KpiCard
                  label="Discount Rate"
                  value={s2.discount_rate != null ? `${s2.discount_rate}%` : '—'}
                  sub={s2.discounted_count != null && s2.matched_count != null
                    ? `${s2.discounted_count} of ${s2.matched_count} matched`
                    : ''}
                  color="#f59e0b"
                  onClick={() => openDrill('promo_discount', null, 'Discounts — Matched Greets')}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <BreakdownCard
                  title="Match Breakdown"
                  total={s2.total_for_match}
                  segments={[
                    { key: 'exact_vin',   label: 'VIN exact',   count: s2.match_breakdown.exact_vin,   color: '#10b981' },
                    { key: 'exact_plate', label: 'Plate exact', count: s2.match_breakdown.exact_plate, color: '#3b82f6' },
                    { key: 'no_match',    label: 'No match',    count: s2.match_breakdown.no_match,    color: '#ef4444' },
                  ]}
                  tooltip="See section title for what unmatched means."
                  onSegmentClick={(seg) => openDrill('match_breakdown', seg, `Match — ${formatMatchQuality(seg)}`)}
                />
                <BayDurationCard
                  data={s2.bay_duration_by_classification}
                  outliers={s2.outliers_excluded}
                  onSegmentClick={(seg) => openDrill('bay_duration', seg, `Bay Duration — ${seg.toUpperCase()}`)}
                />
              </div>
            </div>

            {/* ── Section 3 — Customer satisfaction ──────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle tooltip="Net Promoter Score. Shown whenever at least one response is in range; n is always surfaced so you can weight it.">
                Customer Satisfaction (NPS)
              </SectionTitle>

              {s3.response_count === 0 ? (
                <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>No NPS responses yet in this range</div>
                  <div style={{ fontSize: '12px' }}>
                    Surveys arrive days after the visit. Widen the date range or check back later.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <KpiCard
                    label="Avg NPS"
                    value={s3.avg_nps != null ? String(s3.avg_nps) : '—'}
                    sub={`${s3.response_count} response${s3.response_count !== 1 ? 's' : ''}`}
                    color="#10b981"
                    highlight={s3.avg_nps != null}
                    onClick={() => openDrill('nps', null, 'NPS — All Responses')}
                  />
                  <KpiCard
                    label="NPS · EXPRESS"
                    value={s3.by_classification.express.avg != null ? String(s3.by_classification.express.avg) : '—'}
                    sub={`n=${s3.by_classification.express.n}`}
                    color="#ef4444"
                    onClick={s3.by_classification.express.n > 0 ? () => openDrill('nps', 'express', 'NPS — EXPRESS Visits') : undefined}
                  />
                  <KpiCard
                    label="NPS · FULL"
                    value={s3.by_classification.full.avg != null ? String(s3.by_classification.full.avg) : '—'}
                    sub={`n=${s3.by_classification.full.n}`}
                    color="#10b981"
                    onClick={s3.by_classification.full.n > 0 ? () => openDrill('nps', 'full', 'NPS — FULL Visits') : undefined}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Drill-down modal */}
        {drill && (
          <DrillDownModal
            open={true}
            onClose={closeDrill}
            metric={drill.metric}
            segment={drill.segment}
            scope={{ store_id: storeFilter, date_from: dateFrom, date_to: dateTo }}
            title={drill.title}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DrillDownModal — universal row-level drill into any metric/segment.
// Opens when the user clicks a card or a segment of a bar. Calls
// greets-analytics-drill with the (metric, segment, scope) tuple and renders
// an adaptive table — universal columns first, then metric-specific columns.
// Always offers a CSV export of the visible rows.
// ============================================================================
function DrillDownModal({ open, onClose, metric, segment, scope, title }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setRows([]);
      try {
        const res = await apiCall(`${API_BASE}/greets-analytics-drill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric, segment,
            store_id: scope.store_id,
            date_from: scope.date_from,
            date_to: scope.date_to,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || 'Unknown error');
        setRows(data.rows || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, metric, segment, scope.store_id, scope.date_from, scope.date_to]);

  if (!open) return null;

  // Define columns per metric — universal first, then metric-specific.
  const columns = (() => {
    const universal = [
      { key: 'short_code',    label: 'Code',    render: (r) => r.short_code },
      { key: 'created_at',    label: 'Date',    render: (r) => formatDateShort(r.created_at) },
      { key: 'customer_name', label: 'Customer', render: (r) => r.customer_name },
      { key: 'vehicle',       label: 'Vehicle', render: (r) => r.vehicle },
    ];
    switch (metric) {
      case 'promo_discount': return [
        ...universal,
        { key: 'promo_discount', label: 'Discount',    render: (r) => formatCurrency(r.promo_discount), right: true, bold: true },
        { key: 'invoice_gross',  label: 'Gross',       render: (r) => r.invoice_gross != null ? formatCurrency(r.invoice_gross) : '—', right: true },
        { key: 'invoice_net',    label: 'Net',         render: (r) => r.invoice_net != null ? formatCurrency(r.invoice_net) : '—', right: true },
        { key: 'invoice_total',  label: 'Total Paid',  render: (r) => r.invoice_total != null ? formatCurrency(r.invoice_total) : '—', right: true },
        { key: 'promo_pct',      label: '% of Gross',  render: (r) => r.promo_pct_of_gross != null ? `${r.promo_pct_of_gross}%` : '—', right: true },
      ];
      case 'match_breakdown': return [
        ...universal,
        { key: 'match_quality', label: 'Match',       render: (r) => formatMatchQuality(r.match_quality) },
        { key: 'classification',label: 'Service',     render: (r) => r.classification?.toUpperCase() || '—' },
        { key: 'invoice_net',   label: 'Net',         render: (r) => r.invoice_net != null ? formatCurrency(r.invoice_net) : '—', right: true },
        { key: 'invoice_total', label: 'Total Paid',  render: (r) => r.invoice_total != null ? formatCurrency(r.invoice_total) : '—', right: true },
      ];
      case 'delta_vs_estimate': return [
        ...universal,
        { key: 'kiosk_estimate', label: 'Estimate',   render: (r) => formatCurrency(r.kiosk_estimate), right: true },
        { key: 'invoice_net',    label: 'Actual Net', render: (r) => formatCurrency(r.invoice_net), right: true },
        { key: 'delta',          label: 'Δ',          render: (r) => `${r.delta >= 0 ? '+' : ''}${formatCurrency(r.delta)}`, right: true, bold: true, color: (r) => r.delta >= 0 ? '#10b981' : '#ef4444' },
        { key: 'promo_discount', label: 'Discount',   render: (r) => r.promo_discount != null ? formatCurrency(r.promo_discount) : '—', right: true },
      ];
      case 'classification_mix': return [
        ...universal,
        { key: 'classification', label: 'Service',  render: (r) => r.classification?.toUpperCase() || '—' },
        { key: 'oil_tier',       label: 'Oil Tier', render: (r) => formatOilTier(r.oil_tier) },
        { key: 'tm_package',     label: 'TM Pkg',   render: (r) => formatTmPackage(r.tm_package) },
        { key: 'estimate',       label: 'Estimate', render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'tm_attach': return [
        ...universal,
        { key: 'tm_package', label: 'TM Pkg',   render: (r) => formatTmPackage(r.tm_package), bold: true },
        { key: 'oil_tier',   label: 'Oil Tier', render: (r) => formatOilTier(r.oil_tier) },
        { key: 'estimate',   label: 'Estimate', render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'tm_retention': return [
        ...universal,
        { key: 'audience',           label: 'Audience',      render: (r) => r.audience === 'welcome' ? 'Welcome' : r.audience === 'returning' ? 'Returning' : '—', bold: true },
        { key: 'retention_offered',  label: 'Pitch Shown',   render: (r) => r.retention_offered  ? '✓' : '—', color: (r) => r.retention_offered  ? '#9b59b6' : '#ccc' },
        { key: 'retention_accepted', label: 'Saved',         render: (r) => r.retention_accepted ? '✓' : '—', bold: true, color: (r) => r.retention_accepted ? '#10b981' : '#ccc' },
        { key: 'tm_package',         label: 'Final TM Pkg',  render: (r) => formatTmPackage(r.tm_package) },
        { key: 'free_engine_prep',   label: 'Free EPS',      render: (r) => r.free_engine_prep ? '✓' : '—', color: (r) => r.free_engine_prep ? '#f59e0b' : '#ccc' },
        { key: 'estimate',           label: 'Estimate',      render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'oil_tier_mix': return [
        ...universal,
        { key: 'oil_tier_selected', label: 'Selected', render: (r) => formatOilTier(r.oil_tier_selected), bold: true },
        { key: 'oil_tier_rec',      label: 'Recommended', render: (r) => r.oil_tier_recommendation ? formatOilTier(r.oil_tier_recommendation) : '—' },
        { key: 'estimate',          label: 'Estimate',  render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'oil_tier_rec_acceptance': return [
        ...universal,
        { key: 'rec_outcome',       label: 'Outcome',    render: (r) => formatRecOutcome(r.rec_outcome), bold: true, color: (r) => recOutcomeColor(r.rec_outcome) },
        { key: 'oil_tier_rec',      label: 'Recommended', render: (r) => r.oil_tier_recommendation ? formatOilTier(r.oil_tier_recommendation) : '—' },
        { key: 'oil_tier_selected', label: 'Selected',    render: (r) => formatOilTier(r.oil_tier_selected) },
        { key: 'estimate',          label: 'Estimate',    render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'rotation_attach': return [
        ...universal,
        { key: 'rotation', label: 'Rotation Choice', render: (r) => formatRotation(r.rotation_choice), bold: true },
        { key: 'estimate', label: 'Estimate',         render: (r) => r.estimated_subtotal != null ? formatCurrency(r.estimated_subtotal) : '—', right: true },
      ];
      case 'engine_prep_attach': return [
        ...universal,
        { key: 'prep',       label: 'Engine Prep', render: (r) => r.has_engine_prep ? '✓ Attached' : '—', bold: true },
        { key: 'tm_package', label: 'TM Pkg',      render: (r) => formatTmPackage(r.tm_package) },
        { key: 'oil_tier',   label: 'Oil Tier',    render: (r) => formatOilTier(r.oil_tier) },
      ];
      case 'caw': return [
        ...universal,
        { key: 'caw_response', label: 'CAW Response', render: (r) => (r.caw_response || '—').toUpperCase(), bold: true },
        { key: 'caw_items',    label: 'Items',
          render: (r) => Array.isArray(r.caw_items_accepted) && r.caw_items_accepted.length > 0
            ? r.caw_items_accepted.join(', ')
            : '—' },
      ];
      case 'wait_preference': return [
        ...universal,
        { key: 'wait_preference', label: 'Wait Pref',  render: (r) => formatWaitPref(r.wait_preference), bold: true },
        { key: 'qualifier',       label: 'Qualifier',  render: (r) => r.qualifier || '—' },
      ];
      case 'bay_duration': return [
        ...universal,
        { key: 'classification', label: 'Service',    render: (r) => r.classification?.toUpperCase() || '—' },
        { key: 'bay_minutes',    label: 'Bay Mins',   render: (r) => `${r.bay_minutes} min${r.is_outlier ? ' ⚠' : ''}`, right: true, bold: true },
        { key: 'started',        label: 'Started',    render: (r) => formatTimeShort(r.invoice_started_at) },
        { key: 'completed',      label: 'Completed',  render: (r) => formatTimeShort(r.invoice_completed_at) },
      ];
      case 'nps': return [
        ...universal,
        { key: 'nps_score',     label: 'NPS',         render: (r) => String(r.nps_score), bold: true, color: (r) => npsBucketColor(r.nps_bucket) },
        { key: 'nps_bucket',    label: 'Bucket',      render: (r) => r.nps_bucket?.toUpperCase() || '—' },
        { key: 'classification',label: 'Service',     render: (r) => r.classification?.toUpperCase() || '—' },
        { key: 'invoice_total', label: 'Total Paid',  render: (r) => r.invoice_total != null ? formatCurrency(r.invoice_total) : '—', right: true },
      ];
      default: return universal;
    }
  })();

  const exportCsv = () => {
    if (rows.length === 0) return;
    const headers = columns.map((c) => c.label);
    const csvRows = rows.map((r) => columns.map((c) => {
      const v = c.render(r);
      const s = (v == null ? '' : String(v));
      // Escape CSV: wrap if contains comma, quote, or newline; double internal quotes
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }));
    const csv = [headers, ...csvRows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greets-${metric}${segment ? '-' + segment : ''}-${scope.date_from}_to_${scope.date_to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white', borderRadius: '15px',
          maxWidth: '1100px', width: '100%', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#9b59b6', color: 'white',
          padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '0.3px' }}>{title}</div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
              {rows.length} record{rows.length !== 1 ? 's' : ''} · {scope.date_from === scope.date_to ? scope.date_from : `${scope.date_from} → ${scope.date_to}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              style={{
                backgroundColor: rows.length === 0 ? 'rgba(255,255,255,0.3)' : 'white',
                color: rows.length === 0 ? 'rgba(255,255,255,0.7)' : '#9b59b6',
                border: 'none', padding: '8px 14px', borderRadius: '18px',
                fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px',
                cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ⤓ CSV
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent', color: 'white',
                border: '1px solid rgba(255,255,255,0.5)', padding: '6px 14px',
                borderRadius: '18px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              CLOSE ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>Loading…</div>
          )}
          {error && (
            <div style={{ padding: '20px 22px', color: '#991b1b', backgroundColor: '#fee2e2' }}>
              Error: {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
              No records match this segment.
            </div>
          )}
          {!loading && !error && rows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} style={{
                      padding: '10px 14px', textAlign: c.right ? 'right' : 'left',
                      fontSize: '10px', fontWeight: '700', color: '#888',
                      letterSpacing: '1px', textTransform: 'uppercase',
                      borderBottom: '2px solid #eee', whiteSpace: 'nowrap',
                    }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.short_code || idx}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    {columns.map((c) => {
                      const color = typeof c.color === 'function' ? c.color(r) : (c.color || '#333');
                      return (
                        <td key={c.key} style={{
                          padding: '10px 14px', textAlign: c.right ? 'right' : 'left',
                          fontSize: '13px', fontWeight: c.bold ? '700' : '400',
                          color, borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap',
                        }}>
                          {c.render(r)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── formatting helpers (also used by main page) ─────────────────────────────
function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return '—'; }
}
function formatTimeShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return '—'; }
}
function formatMatchQuality(q) {
  if (q === 'exact_vin')   return 'VIN';
  if (q === 'exact_plate') return 'PLATE';
  if (q === 'no_match')    return 'NO MATCH';
  return q || '—';
}
function formatOilTier(t) {
  if (!t) return '—';
  if (t === 'blend')             return 'Blend';
  if (t === 'synthetic')         return 'Synthetic';
  if (t === 'european')          return 'European';
  if (t === 'diesel_synthetic')  return 'Diesel Synth';
  return t;
}
function formatTmPackage(t) {
  if (!t || t === 'none')         return '—';
  if (t === 'max_protect')        return 'Max Protect';
  if (t === 'vip')                return 'VIP';
  if (t === 'high_mileage')       return 'High Mileage';
  if (t === 'basic_synthetic')    return 'Basic Synth';
  return t;
}
function formatRotation(r) {
  if (r === 'yes')       return 'Yes';
  if (r === 'no')        return 'No';
  if (r === 'not_sure')  return 'Not sure';
  return r || '—';
}
function formatWaitPref(w) {
  if (w === 'lobby')    return 'Lobby';
  if (w === 'in_car')   return 'In car';
  if (w === 'drop_off') return 'Drop off';
  return w || '—';
}
function formatRecOutcome(o) {
  if (o === 'accepted')   return '✓ Accepted';
  if (o === 'downgraded') return '↓ Downgraded';
  if (o === 'upgraded')   return '↑ Upgraded';
  if (o === 'no_rec')     return 'No rec';
  return 'Other';
}
function recOutcomeColor(o) {
  if (o === 'accepted')   return '#10b981';
  if (o === 'downgraded') return '#ef4444';
  if (o === 'upgraded')   return '#3b82f6';
  return '#888';
}
function npsBucketColor(b) {
  if (b === 'promoter')  return '#10b981';
  if (b === 'detractor') return '#ef4444';
  if (b === 'passive')   return '#f59e0b';
  return '#888';
}

// ─── Reports tab pill row (shared visual between Tires and Greets reports) ──
// Lives in this file because it's a small, low-stakes UI component; if we
// add a third report it's worth promoting to a shared component file.
export function ReportsTabs({ active }) {
  const tabs = [
    { key: 'tires',  label: 'TIRE QUOTES', href: '#/reports' },
    { key: 'greets', label: 'GREETS',      href: '#/reports/greets' },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <a
            key={t.key}
            href={t.href}
            style={{
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              borderRadius: '18px',
              border: isActive ? '2px solid #9b59b6' : '2px solid #e5e7eb',
              backgroundColor: isActive ? '#9b59b6' : 'white',
              color: isActive ? 'white' : '#666',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
