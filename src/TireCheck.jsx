// TireCheck.jsx
// #/tire-check/<greet_id> — the customer's "Your tire check" page. Public: the customer reaches
// it from their GREET confirmation page or summary email. PCJL only.
//
// Shows the Jiffy Pitstop tire scan from this visit (linked to the check-in), the quote if one
// was made (the existing public #/quote/<code> view), and earlier scans of the same vehicle.
// Until the CSA finishes the scan it says so and offers a refresh — the link is handed out at
// check-in, before any scan exists.
//
// Data: get-tire-check (tire data only; the greet_id is the only key it accepts).

import React, { useCallback, useEffect, useState } from 'react';
import { apiCallPublic } from './apiClient';
import { API_BASE } from './config';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';
const MAROON = '#8b1538';
const PURPLE = '#9b59b6';

const RATING = {
  good: { label: 'Good', color: '#16a34a', bg: '#f0fdf4' },
  consider: { label: 'Consider', color: '#d97706', bg: '#fffbeb' },
  replace: { label: 'Replace', color: '#dc2626', bg: '#fef2f2' },
};

const VERDICT = {
  good: 'Your tires look good',
  consider: 'Some tires to keep an eye on',
  replace: 'We recommend replacing some tires',
};

// Walk order, driver's front then counter-clockwise (Tire Finder positions).
const TIRES = [
  { key: 'lf', label: "Driver's front" },
  { key: 'lr', label: "Driver's rear" },
  { key: 'rr', label: 'Passenger rear' },
  { key: 'rf', label: 'Passenger front' },
];

const REASONS = {
  age: 'Over 10 years old',
  uneven_wear: 'Uneven wear',
  sidewall_damage: 'Sidewall damage',
  tread_damage: 'Tread damage',
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

// Names come from the register in capitals ("RAUL").
function niceName(n) {
  return String(n).toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function formatPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p || '';
}

function lowestOf(t) {
  const vals = [t?.inside, t?.middle, t?.outside].filter((v) => typeof v === 'number');
  return vals.length ? Math.min(...vals) : null;
}

function TireGrid({ scan, compact = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? '6px' : '10px' }}>
      {TIRES.map(({ key, label }) => {
        const t = scan.tires?.treads?.[key];
        const r = RATING[scan.tires?.ratings?.[key]] || null;
        const reasons = scan.tires?.reasons?.[key] || [];
        return (
          <div key={key} style={{ border: `1.5px solid ${r ? r.color : '#e2e8f0'}`, backgroundColor: r ? r.bg : 'white', borderRadius: '10px', padding: compact ? '6px 8px' : '10px' }}>
            <div style={{ fontSize: compact ? '11px' : '12px', fontWeight: 700, color: '#334155' }}>{label}</div>
            {r && <div style={{ fontSize: compact ? '12px' : '14px', fontWeight: 800, color: r.color, marginTop: '2px' }}>{r.label}</div>}
            {compact ? (
              <div style={{ fontSize: '11px', color: '#64748b' }}>{lowestOf(t) !== null ? `${lowestOf(t)}/32"` : '—'}</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {[t?.inside, t?.middle, t?.outside].map((v, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', backgroundColor: 'white', borderRadius: '6px', padding: '4px 0' }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>{i === 1 ? 'MID' : 'EDGE'}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>{typeof v === 'number' ? v : '—'}</div>
                    </div>
                  ))}
                </div>
                {reasons.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600, marginTop: '6px' }}>
                    {reasons.map((x) => REASONS[x] || x).join(' · ')}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TireCheck({ greetId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCallPublic(`${API_BASE}/get-tire-check?greet=${encodeURIComponent(greetId)}`, { method: 'GET' });
      const json = await res.json();
      if (!json.success) setError(res.status === 404 ? 'We couldn’t find this tire check.' : 'Something went wrong. Please try again.');
      else {
        setData(json);
        setError(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [greetId]);

  useEffect(() => {
    load();
  }, [load]);

  const card = { backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
  const store = data?.visit?.store;
  const scan = data?.scan;

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '12px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ ...card, borderTop: `5px solid ${MAROON}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <img src={JL_LOGO} alt="Jiffy Lube Multicare" style={{ height: '32px' }} />
          {store && (
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#334155' }}>
              <div style={{ fontWeight: 700 }}>{store.name || `Store ${store.number}`}</div>
              {store.phone && <a href={`tel:${String(store.phone).replace(/\D/g, '')}`} style={{ color: MAROON, fontWeight: 600, textDecoration: 'none' }}>{formatPhone(store.phone)}</a>}
            </div>
          )}
        </div>

        {loading && !data && <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>Loading your tire check…</div>}
        {error && <div style={{ ...card, textAlign: 'center', color: '#b91c1c' }}>{error}</div>}

        {data && (
          <>
            <div style={card}>
              <div style={{ fontSize: '11px', letterSpacing: '2px', color: MAROON, fontWeight: 700 }}>YOUR TIRE CHECK</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                {data.visit.first_name ? `Hi ${niceName(data.visit.first_name)}` : 'Hello'}
              </div>
              <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
                {[data.visit.vehicle, formatDate(data.visit.date)].filter(Boolean).join(' · ')}
              </div>
            </div>

            {!scan || scan.status === 'in_progress' ? (
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: '28px' }}>🛞</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>
                  {scan ? 'We’re checking your tires now' : 'Your tire check will appear here'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {scan ? 'Your results will be ready in a few minutes.' : 'Once your technician scans your tires, the results show up on this page.'}
                </div>
                <button onClick={load} disabled={loading} style={{ marginTop: '12px', border: `2px solid ${PURPLE}`, color: PURPLE, backgroundColor: 'white', borderRadius: '20px', padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Checking…' : 'Refresh'}
                </button>
              </div>
            ) : (
              <div style={card}>
                <div style={{ textAlign: 'center', fontSize: '17px', fontWeight: 800, color: RATING[scan.overall_status]?.color || '#1e293b', marginBottom: '4px' }}>
                  {VERDICT[scan.overall_status] || 'Your tire results'}
                </div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  Tread depth in 32nds of an inch{scan.tire_size ? ` · ${scan.tire_size_rear ? `${scan.tire_size} front, ${scan.tire_size_rear} rear` : scan.tire_size}` : ''}
                </div>
                <TireGrid scan={scan} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '11px', color: '#64748b', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span><b style={{ color: RATING.good.color }}>●</b> 7/32+ good</span>
                  <span><b style={{ color: RATING.consider.color }}>●</b> 5–6/32 consider</span>
                  <span><b style={{ color: RATING.replace.color }}>●</b> 4/32 or less replace</span>
                </div>
              </div>
            )}

            {data.quotes?.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: MAROON, fontWeight: 700, marginBottom: '8px' }}>YOUR TIRE QUOTE</div>
                {data.quotes.map((q) => (
                  <a key={q.short_code} href={`#/quote/${q.short_code}`} style={{ display: 'block', textAlign: 'center', backgroundColor: PURPLE, color: 'white', borderRadius: '24px', padding: '12px', fontWeight: 700, textDecoration: 'none', marginBottom: '6px' }}>
                    View your quote →
                  </a>
                ))}
              </div>
            )}

            {data.history?.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: MAROON, fontWeight: 700, marginBottom: '8px' }}>EARLIER TIRE CHECKS</div>
                {data.history.map((h, i) => (
                  <div key={i} style={{ borderTop: i ? '1px solid #eef2f7' : 'none', paddingTop: i ? '10px' : 0, marginTop: i ? '10px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{formatDate(h.scanned_at)}</span>
                      <span style={{ fontWeight: 700, color: RATING[h.overall_status]?.color || '#64748b' }}>{RATING[h.overall_status]?.label || ''}</span>
                    </div>
                    <TireGrid scan={h} compact />
                  </div>
                ))}
              </div>
            )}

            {store?.phone && (
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#475569', margin: '8px 0 20px' }}>
                Questions? Call us at{' '}
                <a href={`tel:${String(store.phone).replace(/\D/g, '')}`} style={{ color: MAROON, fontWeight: 700, textDecoration: 'none' }}>{formatPhone(store.phone)}</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
