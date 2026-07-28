import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { apiCall } from './apiClient';
import { ReportsTabs } from './GreetsReports';
import { API_BASE } from './config';

// Brakes & Mechanical quote performance report.
// Mirrors Reports.jsx (tires) but reads get-mechanical-quote-report, whose
// datasets are quote_metrics (by store), csa_metrics (by CSA) and
// brakes_eroc_metrics (same-visit brake conversion context). Brakes and other
// mechanical work are quoted through the same tool, so one report covers both;
// the brakes/mechanical split comes from what the customer later BOUGHT.

const STORES = [
  { id: 609,  name: 'Santa Maria',                number: 609  },
  { id: 1002, name: 'San Luis Obispo',            number: 1002 },
  { id: 1257, name: 'Goleta',                     number: 1257 },
  { id: 1270, name: 'Arroyo Grande',              number: 1270 },
  { id: 1396, name: 'Santa Barbara (Downtown)',   number: 1396 },
  { id: 1932, name: 'Atascadero',                 number: 1932 },
  { id: 2911, name: 'Paso Robles',                number: 2911 },
  { id: 4182, name: 'Santa Barbara (Upper State)',number: 4182 },
];

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);
// Whole-dollar currency for KPI tiles, where cents don't fit and don't matter.
const formatCurrency0 = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const formatPct = (v) => (v === null || v === undefined ? '—' : `${v}%`);
const formatNum = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString());

const todayPacific = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const getPreset = (preset) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = todayPacific();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'this_week') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return { from: fmt(d), to: today };
  }
  if (preset === 'this_month') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, to: today };
  }
  if (preset === 'last_month') {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const last = new Date(d.getFullYear(), d.getMonth(), 0);
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

// ─── Sub-components (mirrors Reports.jsx) ────────────────────────────────────

const KpiCard = ({ label, value, sub, color = '#9b59b6', highlight = false }) => {
  // Auto-shrink the value font so long strings (e.g. "$1,234,567") don't
  // overflow the fixed-width tile.
  const len = String(value).length;
  const valueFontSize = len > 11 ? '19px' : len > 9 ? '22px' : len > 7 ? '25px' : '28px';
  return (
    <div style={{
      backgroundColor: highlight ? color : 'white',
      border: `2px solid ${color}`, borderRadius: '12px', padding: '18px 22px',
      textAlign: 'center', flex: '1 1 140px', minWidth: '130px', overflow: 'hidden',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: highlight ? 'rgba(255,255,255,0.85)' : '#888', letterSpacing: '1px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: valueFontSize, fontWeight: '800', color: highlight ? 'white' : color, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: highlight ? 'rgba(255,255,255,0.75)' : '#aaa', marginTop: '5px' }}>{sub}</div>}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <h3 style={{
    fontSize: '13px', fontWeight: '700', color: '#9b59b6', letterSpacing: '1.5px',
    textTransform: 'uppercase', borderBottom: '2px solid #f3e8ff', paddingBottom: '8px',
    marginBottom: '16px', marginTop: '0',
  }}>{children}</h3>
);

const Th = ({ children, right }) => (
  <th style={{
    padding: '10px 14px', textAlign: right ? 'right' : 'left', fontSize: '10px',
    fontWeight: '700', color: '#888', letterSpacing: '1px', textTransform: 'uppercase',
    borderBottom: '2px solid #eee', whiteSpace: 'nowrap',
  }}>{children}</th>
);

const Td = ({ children, right, bold, color }) => (
  <td style={{
    padding: '11px 14px', textAlign: right ? 'right' : 'left', fontSize: '13px',
    fontWeight: bold ? '700' : '400', color: color || '#333',
    borderBottom: '1px solid #f5f5f5', whiteSpace: 'nowrap',
  }}>{children}</td>
);

const RateBadge = ({ value, thresholds }) => {
  if (value === null || value === undefined) return <span style={{ color: '#ccc' }}>—</span>;
  const [g, y] = thresholds || [30, 15];
  const bg = value >= g ? '#d1fae5' : value >= y ? '#fef3c7' : '#fee2e2';
  const col = value >= g ? '#065f46' : value >= y ? '#92400e' : '#991b1b';
  return (
    <span style={{ backgroundColor: bg, color: col, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
      {value}%
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MechanicalReports() {
  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; }
  })();
  const isCorporate = !auth.store_id || auth.store_id === 'all';
  const authStoreId = auth.store_id && auth.store_id !== 'all' ? Number(auth.store_id) : null;

  const [preset, setPreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState(() => getPreset('this_month').from);
  const [dateTo, setDateTo] = useState(() => getPreset('this_month').to);
  const [customMode, setCustomMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const applyPreset = (p) => {
    setPreset(p);
    setCustomMode(false);
    const { from, to } = getPreset(p);
    setDateFrom(from);
    setDateTo(to);
  };

  const fetchReport = async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall(`${API_BASE}/get-mechanical-quote-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from: from, date_to: to, store_id: authStoreId }),
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

  useEffect(() => { fetchReport(dateFrom, dateTo); }, [dateFrom, dateTo]);

  // ── Aggregate totals for the KPI strip ──
  const totals = (() => {
    if (!reportData) return null;
    const qm = reportData.quote_metrics || [];
    const bm = reportData.brakes_eroc_metrics || [];

    const totalQuotes    = qm.reduce((s, r) => s + (r.total_quotes || 0), 0);
    const totalValue     = qm.reduce((s, r) => s + (r.total_quoted_value || 0), 0);
    const purchased      = qm.reduce((s, r) => s + (r.conversion?.purchased || 0), 0);
    const notPurchased   = qm.reduce((s, r) => s + (r.conversion?.not_purchased || 0), 0);
    const convBrakes     = qm.reduce((s, r) => s + (r.conversion?.brakes || 0), 0);
    const convMech       = qm.reduce((s, r) => s + (r.conversion?.mechanical || 0), 0);
    const convBoth       = qm.reduce((s, r) => s + (r.conversion?.both || 0), 0);
    const withCust       = qm.reduce((s, r) => s + Math.round((r.pct_with_customer_info / 100) * r.total_quotes), 0);
    const matchable      = purchased + notPurchased;

    const brakeOpps = bm.reduce((s, r) => s + (r.total_brakes_opportunities || 0), 0);
    const brakeSold = bm.reduce((s, r) => s + (r.total_brakes_sold || 0), 0);

    return {
      total_quotes: totalQuotes,
      total_value: totalValue,
      avg_quote_value: totalQuotes > 0 ? totalValue / totalQuotes : 0,
      quote_conversion_rate: matchable > 0 ? Math.round((purchased / matchable) * 1000) / 10 : null,
      converted_brakes: convBrakes + convBoth,
      converted_mech: convMech + convBoth,
      pct_with_customer_info: totalQuotes > 0 ? Math.round((withCust / totalQuotes) * 1000) / 10 : 0,
      brakes_eroc_conversion: brakeOpps > 0 ? Math.round((brakeSold / brakeOpps) * 1000) / 10 : null,
    };
  })();

  // Join quote + brakes-eroc metrics by store for the main table
  const storeRows = (() => {
    if (!reportData) return [];
    const storeMap = {};
    const visibleStores = isCorporate ? STORES : STORES.filter((s) => s.id === authStoreId);
    for (const s of visibleStores) {
      storeMap[s.number] = { store_number: s.number, store_name: s.name, quote: null, brakes: null };
    }
    for (const q of (reportData.quote_metrics || [])) {
      const s = STORES.find((x) => x.id === q.store_id);
      if (s && storeMap[s.number]) storeMap[s.number].quote = q;
    }
    for (const b of (reportData.brakes_eroc_metrics || [])) {
      if (storeMap[b.store_number]) storeMap[b.store_number].brakes = b;
    }
    return Object.values(storeMap).sort((a, b) => a.store_number - b.store_number);
  })();

  const deliveryTotals = (() => {
    if (!reportData) return null;
    return (reportData.quote_metrics || []).reduce((acc, r) => {
      acc.emailed   += r.delivery?.emailed   || 0;
      acc.texted    += r.delivery?.texted    || 0;
      acc.presented += r.delivery?.presented || 0;
      acc.partstech += r.delivery?.partstech || 0;
      return acc;
    }, { emailed: 0, texted: 0, presented: 0, partstech: 0 });
  })();

  const csaRows = reportData?.csa_metrics || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <Navbar
        currentPage="reports"
        headerRight={
          <div style={{ fontSize: '13px', color: '#888', fontWeight: '600' }}>
            {isCorporate ? 'All Stores — Corporate View' : `Store ${authStoreId} — ${STORES.find((s) => s.id === authStoreId)?.name || ''}`}
          </div>
        }
      />

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '30px 20px' }}>
        <ReportsTabs active="mechanical" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1a1a1a' }}>Brakes &amp; Mechanical Quote Performance</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
              Quote activity · Quote → purchase conversion · Brakes EROC context · CSA performance
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'last_month', label: 'Last Month' },
                { key: 'last_30', label: 'Last 30 Days' },
                { key: 'last_90', label: 'Last 90 Days' },
              ].map((p) => (
                <button key={p.key} onClick={() => applyPreset(p.key)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer', border: '2px solid #9b59b6', letterSpacing: '0.5px',
                    backgroundColor: preset === p.key && !customMode ? '#9b59b6' : 'white',
                    color: preset === p.key && !customMode ? 'white' : '#9b59b6',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: '600' }}>CUSTOM:</span>
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCustomMode(true); setPreset(''); }}
                style={{ padding: '5px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '12px', outline: 'none' }} />
              <span style={{ fontSize: '12px', color: '#888' }}>to</span>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCustomMode(true); setPreset(''); }}
                style={{ padding: '5px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '12px', outline: 'none' }} />
              <button onClick={() => fetchReport(dateFrom, dateTo)}
                style={{ padding: '6px 16px', borderRadius: '8px', backgroundColor: '#9b59b6', color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Go
              </button>
            </div>
          </div>
        </div>

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

        {!loading && !error && totals && (
          <>
            {/* KPI Scorecard */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Overview — {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <KpiCard label="Quotes Issued"      value={formatNum(totals.total_quotes)}         sub="brakes + mechanical" color="#9b59b6" />
                <KpiCard label="Total Quoted"       value={formatCurrency0(totals.total_value)}    sub="pre-tax quoted value" color="#9b59b6" />
                <KpiCard label="Avg Quote $"        value={formatCurrency(totals.avg_quote_value)} sub="per quote" color="#9b59b6" />
                <KpiCard label="Quote Conversion"   value={formatPct(totals.quote_conversion_rate)} sub="purchased ÷ matchable" color="#3b82f6" highlight={totals.quote_conversion_rate !== null} />
                <KpiCard label="Brakes Converted"   value={formatNum(totals.converted_brakes)}     sub="quotes → brake sale" color="#10b981" />
                <KpiCard label="Mech Converted"     value={formatNum(totals.converted_mech)}       sub="quotes → mech sale" color="#f59e0b" />
                <KpiCard label="% w/ Customer Info" value={formatPct(totals.pct_with_customer_info)} sub="name + contact" color={totals.pct_with_customer_info >= 70 ? '#10b981' : '#f59e0b'} />
                <KpiCard label="Brakes EROC Conv."  value={formatPct(totals.brakes_eroc_conversion)} sub="same-visit (red/yellow)" color="#10b981" highlight={totals.brakes_eroc_conversion !== null} />
              </div>
            </div>

            {/* Store Breakdown */}
            <div style={{ marginBottom: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 0' }}><SectionTitle>Store Breakdown</SectionTitle></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <Th>Store</Th>
                      <Th right>Quotes</Th>
                      <Th right>Quoted $</Th>
                      <Th right>Avg $</Th>
                      <Th right>Quote Conv.</Th>
                      <Th right>Brakes ✓</Th>
                      <Th right>Mech ✓</Th>
                      <Th right>% Cust Info</Th>
                      <Th right>Brakes EROC</Th>
                      <Th right>Brakes Attach</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeRows.map((row, idx) => {
                      const q = row.quote;
                      const b = row.brakes;
                      return (
                        <tr key={row.store_number} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#9b59b6', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {row.store_number} · {row.store_name}
                          </td>
                          <Td right bold color="#9b59b6">{formatNum(q?.total_quotes)}</Td>
                          <Td right>{q ? formatCurrency(q.total_quoted_value) : '—'}</Td>
                          <Td right>{q ? formatCurrency(q.avg_quote_value) : '—'}</Td>
                          <Td right><RateBadge value={q?.conversion?.quote_conversion_rate} thresholds={[25, 12]} /></Td>
                          <Td right bold color="#059669">{formatNum(q?.conversion ? (q.conversion.brakes + q.conversion.both) : null)}</Td>
                          <Td right bold color="#d97706">{formatNum(q?.conversion ? (q.conversion.mechanical + q.conversion.both) : null)}</Td>
                          <Td right><RateBadge value={q?.pct_with_customer_info} thresholds={[70, 40]} /></Td>
                          <Td right><RateBadge value={b?.brakes_conversion_rate} thresholds={[35, 20]} /></Td>
                          <Td right><RateBadge value={b?.brakes_attach_rate} thresholds={[10, 5]} /></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {isCorporate && totals && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#f3e8ff', borderTop: '2px solid #9b59b6' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#9b59b6', fontSize: '13px' }}>ALL STORES</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#9b59b6' }}>{formatNum(totals.total_quotes)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(totals.total_value)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(totals.avg_quote_value)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.quote_conversion_rate} thresholds={[25, 12]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>{formatNum(totals.converted_brakes)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{formatNum(totals.converted_mech)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.pct_with_customer_info} thresholds={[70, 40]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.brakes_eroc_conversion} thresholds={[35, 20]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>—</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Delivery + Conversion Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                <SectionTitle>Quote Delivery Methods</SectionTitle>
                {deliveryTotals && (() => {
                  const total = deliveryTotals.emailed + deliveryTotals.texted + deliveryTotals.presented + deliveryTotals.partstech;
                  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: '📧 Emailed',        value: deliveryTotals.emailed,   color: '#3b82f6' },
                        { label: '💬 Texted',         value: deliveryTotals.texted,    color: '#10b981' },
                        { label: '🖥️ Presented',      value: deliveryTotals.presented, color: '#9b59b6' },
                        { label: '🔧 PartsTech Order', value: deliveryTotals.partstech, color: '#f59e0b' },
                      ].map((d) => (
                        <div key={d.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{d.label}</span>
                            <span style={{ fontSize: '13px', color: '#888' }}>{formatNum(d.value)} <span style={{ fontSize: '11px' }}>({pct(d.value)}%)</span></span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct(d.value)}%`, height: '100%', backgroundColor: d.color, borderRadius: '4px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                <SectionTitle>Quote Conversion Funnel</SectionTitle>
                {(() => {
                  const qm = reportData?.quote_metrics || [];
                  const purchased    = qm.reduce((s, r) => s + (r.conversion?.purchased || 0), 0);
                  const notPurchased = qm.reduce((s, r) => s + (r.conversion?.not_purchased || 0), 0);
                  const unmatched    = qm.reduce((s, r) => s + (r.conversion?.unmatched || 0), 0);
                  const totalQuotes  = qm.reduce((s, r) => s + (r.total_quotes || 0), 0);
                  const matchable    = purchased + notPurchased;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { label: '✅ Purchased',       value: purchased,    color: '#10b981', of: matchable },
                          { label: '— Not Purchased',    value: notPurchased, color: '#ef4444', of: matchable },
                          { label: '? No Plate on File', value: unmatched,    color: '#94a3b8', of: totalQuotes },
                        ].map((f) => (
                          <div key={f.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>{f.label}</span>
                              <span style={{ fontSize: '13px', color: '#888' }}>
                                {formatNum(f.value)}
                                {f.of > 0 && <span style={{ fontSize: '11px' }}> ({Math.round((f.value / f.of) * 100)}%)</span>}
                              </span>
                            </div>
                            <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${f.of > 0 ? Math.round((f.value / f.of) * 100) : 0}%`, height: '100%', backgroundColor: f.color, borderRadius: '4px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                        <strong>Note:</strong> A quote counts as converted when the quoted vehicle (matched by
                        license plate) later buys brake or mechanical work — same visit or within 6 months.
                        Quotes without a plate on file cannot be tracked and show as "No Plate."
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* CSA Performance */}
            {csaRows.length > 0 && (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '20px 20px 0' }}><SectionTitle>CSA Performance</SectionTitle></div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <Th>Employee</Th>
                        <Th right>Quotes</Th>
                        <Th right>Quoted $</Th>
                        <Th right>Purchased</Th>
                        <Th right>Quote Conv.</Th>
                        <Th right>Brakes ✓</Th>
                        <Th right>Mech ✓</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {csaRows.map((csa, idx) => (
                        <tr key={csa.employee_name} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '11px 14px', fontWeight: '600', color: '#333' }}>{csa.employee_name}</td>
                          <Td right bold color="#9b59b6">{formatNum(csa.total_quotes)}</Td>
                          <Td right>{formatCurrency(csa.total_quoted_value)}</Td>
                          <Td right>{formatNum(csa.conversion?.purchased)}</Td>
                          <Td right><RateBadge value={csa.conversion?.quote_conversion_rate} thresholds={[25, 12]} /></Td>
                          <Td right color="#059669">{formatNum(csa.conversion ? (csa.conversion.brakes + csa.conversion.both) : null)}</Td>
                          <Td right color="#d97706">{formatNum(csa.conversion ? (csa.conversion.mechanical + csa.conversion.both) : null)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !totals && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔧</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Select a date range to load the report</div>
          </div>
        )}
      </div>

      <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>© 2026 P.C.J.L., Inc.</p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>tires.myjiffylube.ai</p>
        </div>
      </footer>
    </div>
  );
}
