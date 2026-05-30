import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { apiCall } from './apiClient';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';

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
// hidden dependency on the other.
const KpiCard = ({ label, value, sub, color = '#9b59b6', highlight = false }) => (
  <div style={{
    backgroundColor: highlight ? color : 'white',
    border: `2px solid ${color}`,
    borderRadius: '12px',
    padding: '18px 22px',
    textAlign: 'center',
    flex: '1 1 140px',
    minWidth: '130px',
  }}>
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
const SegmentBar = ({ segments, total, color = '#9b59b6' }) => {
  if (!segments || segments.length === 0 || !total) {
    return <div style={{ fontSize: '12px', color: '#aaa' }}>No data</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {segments.map((seg) => {
        const pct = total > 0 ? (seg.count / total) * 100 : 0;
        return (
          <div key={seg.label}>
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

const BreakdownCard = ({ title, segments, total, color, tooltip }) => (
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
    <SegmentBar segments={segments} total={total} color={color} />
  </div>
);

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
                <KpiCard label="Total Greets"        value={formatNum(s1.total_greets)}      sub={`${dateFrom === dateTo ? dateFrom : `${dateFrom} → ${dateTo}`}`} />
                <KpiCard label="Oil-Change Greets"   value={formatNum(s1.oil_change_greets)} sub="denominator for attach rates" color="#3b82f6" />
                <KpiCard label="Avg Kiosk Estimate"  value={s1.avg_kiosk_estimate != null ? formatCurrency(s1.avg_kiosk_estimate) : '—'} sub="oil-change greets, pre-tax" color="#10b981" />
                <KpiCard
                  label="Engine Prep Attach"
                  value={s1.oil_change_greets > 0 ? `${Math.round((s1.engine_prep_attach / s1.oil_change_greets) * 100)}%` : '—'}
                  sub={`${s1.engine_prep_attach} of ${s1.oil_change_greets}`}
                  color="#f59e0b"
                />
              </div>

              {/* Bars: classification, TM, rotation, wait pref */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <BreakdownCard
                  title="EXPRESS vs FULL"
                  total={s1.oil_change_greets}
                  segments={[
                    { label: 'EXPRESS',  count: s1.classification_mix.express, color: '#ef4444' },
                    { label: 'FULL',     count: s1.classification_mix.full,    color: '#10b981' },
                    ...(s1.classification_mix.other > 0 ? [{ label: 'Other', count: s1.classification_mix.other, color: '#cbd5e1' }] : []),
                  ]}
                  tooltip="Denominator: oil-change greets only."
                />
                <BreakdownCard
                  title="TM Package Attach"
                  total={s1.oil_change_greets}
                  segments={[
                    { label: 'Max Protect',  count: s1.tm_attach.by_tier.max_protect,     color: '#7c3aed' },
                    { label: 'VIP',          count: s1.tm_attach.by_tier.vip,             color: '#9b59b6' },
                    { label: 'High Mileage', count: s1.tm_attach.by_tier.high_mileage,    color: '#a78bfa' },
                    { label: 'Basic Synth',  count: s1.tm_attach.by_tier.basic_synthetic, color: '#c4b5fd' },
                    { label: '— None',       count: s1.tm_attach.by_tier.none,            color: '#e5e7eb' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Denominator: oil-change greets only."
                />
                <BreakdownCard
                  title="Tire Rotation"
                  total={s1.oil_change_greets}
                  segments={[
                    { label: 'Yes',      count: s1.rotation_attach.yes,      color: '#10b981' },
                    { label: 'No',       count: s1.rotation_attach.no,       color: '#ef4444' },
                    { label: 'Not sure', count: s1.rotation_attach.not_sure, color: '#f59e0b' },
                  ].filter((seg) => seg.count > 0)}
                />
                <BreakdownCard
                  title="Wait Preference"
                  total={s1.total_greets}
                  segments={[
                    { label: 'Lobby',    count: s1.wait_preference.lobby,    color: '#3b82f6' },
                    { label: 'In car',   count: s1.wait_preference.in_car,   color: '#f59e0b' },
                    { label: 'Drop off', count: s1.wait_preference.drop_off, color: '#7c3aed' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="All greets (not just oil-change)."
                />
                <BreakdownCard
                  title="CAW Upsell"
                  total={s1.caw.offered}
                  segments={[
                    { label: 'Accepted', count: s1.caw.accepted,                       color: '#10b981' },
                    { label: 'Declined', count: Math.max(s1.caw.offered - s1.caw.accepted, 0), color: '#ef4444' },
                  ].filter((seg) => seg.count > 0)}
                  tooltip="Denominator: greets where CAW was offered (returning customers with eligible items)."
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
                  sub={s2.avg_promo_pct_of_gross != null ? `${s2.avg_promo_pct_of_gross}% of gross` : ''}
                  color="#f59e0b"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <BreakdownCard
                  title="Match Breakdown"
                  total={s2.total_for_match}
                  segments={[
                    { label: 'VIN exact',   count: s2.match_breakdown.exact_vin,   color: '#10b981' },
                    { label: 'Plate exact', count: s2.match_breakdown.exact_plate, color: '#3b82f6' },
                    { label: 'No match',    count: s2.match_breakdown.no_match,    color: '#ef4444' },
                  ]}
                  tooltip="See section title for what unmatched means."
                />
                <BreakdownCard
                  title="Avg Bay Duration by Classification"
                  total={(s2.bay_duration_by_classification.express.n || 0) + (s2.bay_duration_by_classification.full.n || 0)}
                  segments={[
                    {
                      label: `EXPRESS · ${s2.bay_duration_by_classification.express.avg_minutes != null ? `${s2.bay_duration_by_classification.express.avg_minutes} min` : '—'}`,
                      count: s2.bay_duration_by_classification.express.n || 0,
                      color: '#ef4444',
                    },
                    {
                      label: `FULL · ${s2.bay_duration_by_classification.full.avg_minutes != null ? `${s2.bay_duration_by_classification.full.avg_minutes} min` : '—'}`,
                      count: s2.bay_duration_by_classification.full.n || 0,
                      color: '#10b981',
                    },
                  ].filter((seg) => seg.count > 0)}
                  tooltip={`Outliers excluded: ${s2.outliers_excluded}. Bay times outside 2-180 min are dropped from the average.`}
                />
              </div>
            </div>

            {/* ── Section 3 — Customer satisfaction ──────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle tooltip={`Net Promoter Score. Only shown when there are at least ${s3.min_n_for_score} responses in the range.`}>
                Customer Satisfaction (NPS)
              </SectionTitle>

              {s3.response_count < s3.min_n_for_score ? (
                <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Not enough NPS responses yet</div>
                  <div style={{ fontSize: '12px' }}>
                    {s3.response_count} response{s3.response_count !== 1 ? 's' : ''} in range. NPS shown when there are at least {s3.min_n_for_score}.
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
                  />
                  <KpiCard
                    label="NPS · EXPRESS"
                    value={s3.by_classification.express.avg != null ? String(s3.by_classification.express.avg) : '—'}
                    sub={`n=${s3.by_classification.express.n}${s3.by_classification.express.avg == null ? ' (too few)' : ''}`}
                    color="#ef4444"
                  />
                  <KpiCard
                    label="NPS · FULL"
                    value={s3.by_classification.full.avg != null ? String(s3.by_classification.full.avg) : '—'}
                    sub={`n=${s3.by_classification.full.n}${s3.by_classification.full.avg == null ? ' (too few)' : ''}`}
                    color="#10b981"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
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
