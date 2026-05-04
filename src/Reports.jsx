import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

const STORES = [
  { id: 609,  name: 'Santa Maria',               number: 609  },
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

const formatPct = (v) =>
  v === null || v === undefined ? '—' : `${v}%`;

const formatNum = (v) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString();

// Get today's date in YYYY-MM-DD (Pacific time)
const todayPacific = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
};

// Date helpers
const getPreset = (preset) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = todayPacific();

  if (preset === 'today') {
    return { from: today, to: today };
  }
  if (preset === 'this_week') {
    // Monday to today
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const day = d.getDay(); // 0=Sun
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

const SectionTitle = ({ children }) => (
  <h3 style={{
    fontSize: '13px', fontWeight: '700', color: '#9b59b6',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    borderBottom: '2px solid #f3e8ff', paddingBottom: '8px',
    marginBottom: '16px', marginTop: '0',
  }}>
    {children}
  </h3>
);

const Th = ({ children, right }) => (
  <th style={{
    padding: '10px 14px', textAlign: right ? 'right' : 'left',
    fontSize: '10px', fontWeight: '700', color: '#888',
    letterSpacing: '1px', textTransform: 'uppercase',
    borderBottom: '2px solid #eee', whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
);

const Td = ({ children, right, bold, color }) => (
  <td style={{
    padding: '11px 14px', textAlign: right ? 'right' : 'left',
    fontSize: '13px', fontWeight: bold ? '700' : '400',
    color: color || '#333', borderBottom: '1px solid #f5f5f5',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </td>
);

const RateBadge = ({ value, thresholds }) => {
  // thresholds: [green_min, yellow_min] — above green = green, above yellow = yellow, else red
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

// Tiny inline bar chart for opportunity vs sold
const MiniBar = ({ opportunity, sold, label }) => {
  const pct = opportunity > 0 ? Math.min((sold / opportunity) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '8px', backgroundColor: '#f0e6fa', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#9b59b6', borderRadius: '4px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#888', minWidth: '36px', textAlign: 'right' }}>{label}</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  // Auth: read from localStorage (set by StaffPinGate)
  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; }
  })();
  const isCorporate = !auth.store_id || auth.store_id === 'all';
  const authStoreId = auth.store_id && auth.store_id !== 'all' ? Number(auth.store_id) : null;

  // Date range state
  const [preset, setPreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState(() => getPreset('this_month').from);
  const [dateTo, setDateTo]   = useState(() => getPreset('this_month').to);
  const [customMode, setCustomMode] = useState(false);

  // Report data state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [reportData, setReportData] = useState(null);

  // Apply a preset
  const applyPreset = (p) => {
    setPreset(p);
    setCustomMode(false);
    const { from, to } = getPreset(p);
    setDateFrom(from);
    setDateTo(to);
  };

  // Fetch report
  const fetchReport = async (from, to) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/get-quote-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          date_from: from,
          date_to: to,
          store_id: authStoreId,
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

  // Auto-fetch when dates change
  useEffect(() => {
    fetchReport(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  // ── Aggregate totals across all stores for KPI strip ──
  const totals = (() => {
    if (!reportData) return null;
    const em = reportData.eroc_metrics || [];
    const qm = reportData.quote_metrics || [];

    const totalInvoices      = em.reduce((s, r) => s + (r.total_invoices || 0), 0);
    const totalOpportunities = em.reduce((s, r) => s + (r.tire_opportunities || 0), 0);
    const totalTiresSold     = em.reduce((s, r) => s + (r.tires_sold || 0), 0);
    const totalQuotes        = qm.reduce((s, r) => s + (r.total_quotes || 0), 0);
    const totalPurchased     = qm.reduce((s, r) => s + (r.conversion?.purchased || 0), 0);
    const totalMatchable     = qm.reduce((s, r) => s + (r.conversion?.purchased || 0) + (r.conversion?.not_purchased || 0), 0);
    const totalWithCust      = qm.reduce((s, r) => s + Math.round((r.pct_with_customer_info / 100) * r.total_quotes), 0);
    const totalWithTread     = qm.reduce((s, r) => s + Math.round((r.pct_with_tread_depth / 100) * r.total_quotes), 0);

    return {
      total_invoices: totalInvoices,
      tire_opportunities: totalOpportunities,
      tires_sold: totalTiresSold,
      eroc_conversion_rate: totalOpportunities > 0
        ? Math.round((totalTiresSold / totalOpportunities) * 1000) / 10 : null,
      total_quotes: totalQuotes,
      quote_capture_rate: totalOpportunities > 0
        ? Math.round((totalQuotes / totalOpportunities) * 1000) / 10 : null,
      quote_conversion_rate: totalMatchable > 0
        ? Math.round((totalPurchased / totalMatchable) * 1000) / 10 : null,
      pct_with_customer_info: totalQuotes > 0
        ? Math.round((totalWithCust / totalQuotes) * 1000) / 10 : 0,
      pct_with_tread_depth: totalQuotes > 0
        ? Math.round((totalWithTread / totalQuotes) * 1000) / 10 : 0,
    };
  })();

  // Join eroc + quote metrics by store for the main table
  const storeRows = (() => {
    if (!reportData) return [];
    const storeMap = {};

    // Seed from STORES list so all 8 always appear (or just the auth store)
    const visibleStores = isCorporate
      ? STORES
      : STORES.filter(s => s.id === authStoreId);

    for (const s of visibleStores) {
      storeMap[s.number] = {
        store_number: s.number,
        store_name: s.name,
        eroc: null,
        quote: null,
      };
    }

    for (const e of (reportData.eroc_metrics || [])) {
      if (storeMap[e.store_number]) storeMap[e.store_number].eroc = e;
    }
    for (const q of (reportData.quote_metrics || [])) {
      const s = STORES.find(x => x.id === q.store_id);
      if (s && storeMap[s.number]) storeMap[s.number].quote = q;
    }

    return Object.values(storeMap).sort((a, b) => a.store_number - b.store_number);
  })();

  // Delivery totals across all stores
  const deliveryTotals = (() => {
    if (!reportData) return null;
    return (reportData.quote_metrics || []).reduce((acc, r) => {
      acc.emailed  += r.delivery?.emailed   || 0;
      acc.texted   += r.delivery?.texted    || 0;
      acc.paypal   += r.delivery?.paypal    || 0;
      acc.printed  += r.delivery?.printed   || 0;
      return acc;
    }, { emailed: 0, texted: 0, paypal: 0, printed: 0 });
  })();

  const csaRows = reportData?.csa_metrics || [];

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

      {/* Page Body */}
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '30px 20px' }}>

        {/* Page Title + Date Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1a1a1a' }}>Tire Quote Performance</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
              EROC opportunity capture · Quote activity · CSA performance
            </p>
          </div>

          {/* Date Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            {/* Preset pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {[
                { key: 'today',      label: 'Today'      },
                { key: 'this_week',  label: 'This Week'  },
                { key: 'this_month', label: 'This Month' },
                { key: 'last_month', label: 'Last Month' },
                { key: 'last_30',    label: 'Last 30 Days'},
                { key: 'last_90',    label: 'Last 90 Days'},
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer', border: '2px solid #9b59b6', letterSpacing: '0.5px',
                    backgroundColor: preset === p.key && !customMode ? '#9b59b6' : 'white',
                    color: preset === p.key && !customMode ? 'white' : '#9b59b6',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#888', fontWeight: '600' }}>CUSTOM:</span>
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCustomMode(true); setPreset(''); }}
                style={{ padding: '5px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
              <span style={{ fontSize: '12px', color: '#888' }}>to</span>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCustomMode(true); setPreset(''); }}
                style={{ padding: '5px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
              <button
                onClick={() => fetchReport(dateFrom, dateTo)}
                style={{ padding: '6px 16px', borderRadius: '8px', backgroundColor: '#9b59b6', color: 'white', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Go
              </button>
            </div>
          </div>
        </div>

        {/* Loading / Error states */}
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
            {/* ── Section 1: KPI Scorecard ── */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Overview — {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <KpiCard label="Total Invoices"      value={formatNum(totals.total_invoices)}   sub="vehicles through bays" />
                <KpiCard label="Tire Opportunities"  value={formatNum(totals.tire_opportunities)} sub="red + yellow flags"   color="#f59e0b" />
                <KpiCard label="Tires Sold (EROC)"   value={formatNum(totals.tires_sold)}        sub="same-visit"           color="#10b981" />
                <KpiCard label="EROC Conversion"     value={formatPct(totals.eroc_conversion_rate)} sub="sold ÷ opportunity" color="#10b981" highlight={totals.eroc_conversion_rate !== null} />
                <KpiCard label="Quotes Issued"       value={formatNum(totals.total_quotes)}       sub="tire quotes created"  color="#9b59b6" />
                <KpiCard label="Quote Capture Rate"  value={formatPct(totals.quote_capture_rate)} sub="quotes ÷ opportunity" color="#9b59b6" highlight={totals.quote_capture_rate !== null} />
                <KpiCard label="Quote Conversion"    value={formatPct(totals.quote_conversion_rate)} sub="purchased after quote" color="#3b82f6" highlight={totals.quote_conversion_rate !== null} />
                <KpiCard label="% w/ Customer Info"  value={formatPct(totals.pct_with_customer_info)} sub="name + contact"   color={totals.pct_with_customer_info >= 70 ? '#10b981' : '#f59e0b'} />
                <KpiCard label="% w/ Tread Depth"   value={formatPct(totals.pct_with_tread_depth)}  sub="entered on quote"  color={totals.pct_with_tread_depth >= 70 ? '#10b981' : '#f59e0b'} />
              </div>
            </div>

            {/* ── Section 2: Store Breakdown Table ── */}
            <div style={{ marginBottom: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 0' }}>
                <SectionTitle>Store Breakdown</SectionTitle>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <Th>Store</Th>
                      <Th right>Invoices</Th>
                      <Th right>🟡🔴 Opps</Th>
                      <Th right>Tires Sold</Th>
                      <Th right>EROC Conv.</Th>
                      <Th right>Attach Rate</Th>
                      <Th right>Quotes</Th>
                      <Th right>Quote Capture</Th>
                      <Th right>Quote Conv.</Th>
                      <Th right>Avg Quote $</Th>
                      <Th right>% Cust Info</Th>
                      <Th right>% Tread</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeRows.map((row, idx) => {
                      const e = row.eroc;
                      const q = row.quote;
                      const quoteCaptureRate = (e?.tire_opportunities && q?.total_quotes)
                        ? Math.round((q.total_quotes / e.tire_opportunities) * 1000) / 10
                        : null;
                      return (
                        <tr key={row.store_number}
                          style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#9b59b6', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {row.store_number} · {row.store_name}
                          </td>
                          <Td right>{formatNum(e?.total_invoices)}</Td>
                          <Td right bold color="#d97706">{formatNum(e?.tire_opportunities)}</Td>
                          <Td right>{formatNum(e?.tires_sold)}</Td>
                          <Td right>
                            <RateBadge value={e?.tire_conversion_rate} thresholds={[35, 20]} />
                          </Td>
                          <Td right>
                            <RateBadge value={e?.tire_attach_rate} thresholds={[10, 5]} />
                          </Td>
                          <Td right bold color="#9b59b6">{formatNum(q?.total_quotes)}</Td>
                          <Td right>
                            <RateBadge value={quoteCaptureRate} thresholds={[20, 10]} />
                          </Td>
                          <Td right>
                            <RateBadge value={q?.conversion?.quote_conversion_rate} thresholds={[40, 20]} />
                          </Td>
                          <Td right>{q ? formatCurrency(q.avg_quote_value) : '—'}</Td>
                          <Td right>
                            <RateBadge value={q?.pct_with_customer_info} thresholds={[70, 40]} />
                          </Td>
                          <Td right>
                            <RateBadge value={q?.pct_with_tread_depth} thresholds={[70, 40]} />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Totals row (corporate only) */}
                  {isCorporate && totals && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#f3e8ff', borderTop: '2px solid #9b59b6' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#9b59b6', fontSize: '13px' }}>ALL STORES</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatNum(totals.total_invoices)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#d97706' }}>{formatNum(totals.tire_opportunities)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatNum(totals.tires_sold)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.eroc_conversion_rate} thresholds={[35, 20]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>—</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#9b59b6' }}>{formatNum(totals.total_quotes)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.quote_capture_rate} thresholds={[20, 10]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.quote_conversion_rate} thresholds={[40, 20]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>—</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.pct_with_customer_info} thresholds={[70, 40]} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}><RateBadge value={totals.pct_with_tread_depth} thresholds={[70, 40]} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ── Section 3: Two-column row — Delivery Methods + Conversion Funnel ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>

              {/* Delivery Methods */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', padding: '20px' }}>
                <SectionTitle>Quote Delivery Methods</SectionTitle>
                {deliveryTotals && (() => {
                  const total = deliveryTotals.emailed + deliveryTotals.texted + deliveryTotals.paypal + deliveryTotals.printed;
                  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: '📧 Emailed',    value: deliveryTotals.emailed,  color: '#3b82f6' },
                        { label: '💬 Texted',     value: deliveryTotals.texted,   color: '#10b981' },
                        { label: '💳 PayPal',     value: deliveryTotals.paypal,   color: '#f59e0b' },
                        { label: '🖨️ Printed',    value: deliveryTotals.printed,  color: '#94a3b8' },
                      ].map(d => (
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
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                        <span>Total Quotes</span><span style={{ fontWeight: '700', color: '#333' }}>{formatNum(total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Conversion Funnel */}
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
                          { label: '✅ Purchased',      value: purchased,    color: '#10b981', of: matchable },
                          { label: '— Not Purchased',   value: notPurchased, color: '#ef4444', of: matchable },
                          { label: '? No Plate on File',value: unmatched,    color: '#94a3b8', of: totalQuotes },
                        ].map(f => (
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
                        <strong>Note:</strong> Conversion tracked by matching quote license plate to invoice records.
                        Quotes without a plate on file cannot be tracked and show as "No Plate."
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── Section 4: CSA Leaderboard ── */}
            {csaRows.length > 0 && (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginBottom: '32px' }}>
                <div style={{ padding: '20px 20px 0' }}>
                  <SectionTitle>CSA Performance</SectionTitle>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <Th>Employee</Th>
                        <Th right>Invoices</Th>
                        <Th right>Tire Opps</Th>
                        <Th right>Tires Sold</Th>
                        <Th right>Conversion</Th>
                        <Th right>Quotes Created</Th>
                        <Th>Capture Progress</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {csaRows.map((csa, idx) => (
                        <tr key={csa.employee_name} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ fontWeight: '600', color: '#333' }}>
                              {csa.employee_full_name || csa.employee_name}
                            </div>
                            {csa.employee_full_name && (
                              <div style={{ fontSize: '11px', color: '#aaa' }}>{csa.employee_name}</div>
                            )}
                          </td>
                          <Td right>{formatNum(csa.total_invoices)}</Td>
                          <Td right color="#d97706">{formatNum(csa.tire_opportunities)}</Td>
                          <Td right>{formatNum(csa.tires_sold)}</Td>
                          <Td right>
                            <RateBadge value={csa.tire_conversion_rate} thresholds={[35, 20]} />
                          </Td>
                          <Td right bold color="#9b59b6">{formatNum(csa.quotes_created)}</Td>
                          <td style={{ padding: '11px 14px', minWidth: '160px' }}>
                            <MiniBar
                              opportunity={csa.tire_opportunities}
                              sold={csa.tires_sold}
                              label={csa.tire_conversion_rate !== null ? `${csa.tire_conversion_rate}%` : '—'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </>
        )}

        {/* No data state */}
        {!loading && !error && !totals && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Select a date range to load the report</div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>© 2026 P.C.J.L., Inc.</p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>tires.myjiffylube.ai</p>
        </div>
      </footer>

    </div>
  );
}
