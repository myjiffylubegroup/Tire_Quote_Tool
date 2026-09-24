// TireCheck.jsx
// #/tire-check/<greet_id> — the customer's "Your tire check" page. Public: the customer reaches
// it from their GREET confirmation page or summary email. PCJL only.
//
// Shows the Jiffy Pitstop tire scan from this visit (linked to the check-in), the quote if one
// was made (the existing public #/quote/<code> view), and the vehicle's tire history. Until the
// CSA finishes the scan it says so and offers a refresh — the link is handed out at check-in,
// before any scan exists.
//
// Each tire is drawn as a tread profile: the three scanner readings across the tire, filled to
// the depth left, against the 2/32" legal line. All four share one scale (see scaleFor).
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

const DOT = { red: '#dc2626', yellow: '#d97706', green: '#16a34a' };

const VERDICT = {
  good: 'Your tires look good',
  consider: 'Some tires to keep an eye on',
  replace: 'We recommend replacing some tires',
};

// Walk order, driver's front then counter-clockwise (Tire Finder positions). `side` decides which
// end of the profile is the outside edge: on the driver's side you are looking at the tire from
// the left of the car, on the passenger side from the right.
const TIRES = [
  { key: 'lf', label: "Driver's front", side: 'driver' },
  { key: 'lr', label: "Driver's rear", side: 'driver' },
  { key: 'rr', label: 'Passenger rear', side: 'passenger' },
  { key: 'rf', label: 'Passenger front', side: 'passenger' },
];

// Dually: six tires. The rear corners in `tires` are the worse of each pair, so the rear tiles
// read each tire on its own from rear_pairs.
const DUALLY_TIRES = [
  { key: 'lf', label: "Driver's front", side: 'driver' },
  { key: 'lr', label: "Driver's rear outer", pair: 'outer', side: 'driver' },
  { key: 'lr', label: "Driver's rear inner", pair: 'inner', side: 'driver' },
  { key: 'rr', label: 'Passenger rear inner', pair: 'inner', side: 'passenger' },
  { key: 'rr', label: 'Passenger rear outer', pair: 'outer', side: 'passenger' },
  { key: 'rf', label: 'Passenger front', side: 'passenger' },
];

const REASONS = {
  age: 'Over 10 years old',
  uneven_wear: 'Uneven wear',
  sidewall_damage: 'Sidewall damage',
  tread_damage: 'Tread damage',
};

// ─── Dates ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

// Earlier visits come back as a plain YYYY-MM-DD. Passing that to new Date() parses it as UTC
// midnight, which in Pacific is the day before — so build it as a local date instead.
function formatDay(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Names come from the register in capitals ("RAUL").
function niceName(n) {
  return String(n).toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function formatPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p || '';
}

// ─── Reading the tread ───────────────────────────────────────────────────────

function readingsOf(t) {
  return [t?.inside, t?.middle, t?.outside].filter((v) => typeof v === 'number');
}

function lowestOf(t) {
  const vals = readingsOf(t);
  return vals.length ? Math.min(...vals) : null;
}

/**
 * The top of the plot, shared by every tire on the vehicle so they can be read against each
 * other: the deepest reading anywhere on the car, but never less than FLOOR.
 *
 * The floor is what stops a worn-out set from being flattered. Scaled purely to its own deepest
 * reading, a car with four bald tires fills every box to the top and looks no different from a
 * healthy one. A new tire is anywhere from 8/32 to 15/32 depending on the tire and we hold no
 * per-tire spec, so there is no honest fixed ceiling to use instead.
 */
const FLOOR = 6;

function scaleFor(scan) {
  let deepest = FLOOR;
  const eat = (t) => readingsOf(t).forEach((v) => { if (v > deepest) deepest = v; });
  Object.values(scan?.tires?.treads || {}).forEach(eat);
  ['outer', 'inner'].forEach((p) => Object.values(scan?.rear_pairs?.[p] || {}).forEach((x) => eat(x?.tread)));
  return deepest;
}

/**
 * What the shape of the wear means. Derived from the three readings, never invented: a shoulder
 * that is well below the middle is the classic under-inflation pattern, one shoulder alone points
 * at alignment, and a low middle is over-inflation.
 */
const GAP = 1.5;   // 32nds between middle and a shoulder before it counts as a pattern

function wearNote(t) {
  const { inside, middle, outside } = t || {};
  if (typeof inside !== 'number' || typeof middle !== 'number' || typeof outside !== 'number') return null;
  const inLow = middle - inside >= GAP;
  const outLow = middle - outside >= GAP;
  if (inLow && outLow) return { text: 'Worn down on both edges with more tread in the middle — the usual sign of running under-inflated.', service: 'pressure' };
  if (inLow) return { text: 'Worn on the inside edge, which usually points to alignment.', service: 'alignment' };
  if (outLow) return { text: 'Worn on the outside edge, which usually points to alignment.', service: 'alignment' };
  if (inside - middle >= GAP && outside - middle >= GAP) return { text: 'Worn through the middle of the tread — usually a sign of over-inflation.', service: 'pressure' };
  return null;
}

// ─── The tread profile ───────────────────────────────────────────────────────

const BASE = 84;
const TOP = 28;

function TreadProfile({ tread, color, deepest, side }) {
  const y = (d) => BASE - d * ((BASE - TOP) / deepest);
  // Left to right as you look at the tire: the outside shoulder is outboard of the car.
  const [l, m, r] = side === 'driver'
    ? [tread?.outside, tread?.middle, tread?.inside]
    : [tread?.inside, tread?.middle, tread?.outside];
  const leftLabel = side === 'driver' ? 'OUTSIDE' : 'INSIDE';
  const rightLabel = side === 'driver' ? 'INSIDE' : 'OUTSIDE';
  const have = [l, m, r].every((v) => typeof v === 'number');
  const legalY = y(2);

  return (
    <svg viewBox="0 0 330 118" style={{ width: '100%', height: 'auto', marginTop: '6px' }} role="img"
      aria-label={have ? `Tread readings ${l}, ${m} and ${r} thirty-seconds of an inch across the tire.` : 'Tread readings not available for this tire.'}>
      <text x="10" y="13" fontSize="10.5" letterSpacing="1.3" fill="#94a3b8" fontWeight="700">{leftLabel}</text>
      <text x="320" y="13" textAnchor="end" fontSize="10.5" letterSpacing="1.3" fill="#94a3b8" fontWeight="700">{rightLabel}</text>
      <rect x="10" y="28" width="310" height="56" rx="4" fill="#eef2f7" />
      {have && (
        <polygon
          points={`10,${BASE} 10,${y(l)} 55,${y(l)} 165,${y(m)} 275,${y(r)} 320,${y(r)} 320,${BASE}`}
          fill={color}
        />
      )}
      <line x1="10" y1={legalY} x2="320" y2={legalY} stroke="#1e293b" strokeWidth="1.2" strokeDasharray="3 3" />
      {/* White outline behind the glyphs: on a healthy tire the fill reaches this line, and dark
          text straight on the colour was barely readable. */}
      <text x="14" y={legalY - 4} fontSize="9.5" fill="#1e293b" stroke="white" strokeWidth="3"
        strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>2/32 legal minimum</text>
      {[l, m, r].map((v, i) => (
        <text key={i} x={[55, 165, 275][i]} y="101" textAnchor="middle" fontSize="17" fontWeight="700" fill="#1e293b">
          {typeof v === 'number' ? v : '—'}
        </text>
      ))}
      <text x="165" y="114" textAnchor="middle" fontSize="9.5" fill="#94a3b8">tread depth in 32nds</text>
    </svg>
  );
}

// ─── The car ─────────────────────────────────────────────────────────────────
// Lowest reading at each wheel, laid out as the car sits. Skipped for duallies, which have six
// tires and do not fit this diagram.

function CarSummary({ scan }) {
  const corner = (key) => {
    const t = scan.tires?.treads?.[key];
    const r = RATING[scan.tires?.ratings?.[key]] || null;
    return { low: lowestOf(t), color: r?.color || '#94a3b8', label: r?.label || '' };
  };
  const lf = corner('lf'), rf = corner('rf'), lr = corner('lr'), rr = corner('rr');
  const wheel = (x, yy, c) => <rect x={x} y={yy} width="20" height="46" rx="7" fill={c} />;

  return (
    <svg viewBox="0 0 330 196" style={{ width: '100%', height: 'auto' }} role="img"
      aria-label={`Lowest reading at each wheel: driver's front ${lf.low ?? 'not available'}, passenger front ${rf.low ?? 'not available'}, driver's rear ${lr.low ?? 'not available'}, passenger rear ${rr.low ?? 'not available'}.`}>
      <text x="165" y="12" textAnchor="middle" fontSize="11" letterSpacing="1.6" fill="#94a3b8" fontWeight="700">FRONT</text>
      <rect x="112" y="22" width="106" height="162" rx="32" fill="#e8eef5" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="126" y="40" width="78" height="30" rx="12" fill="#dbe3ec" />
      <rect x="126" y="136" width="78" height="26" rx="11" fill="#dbe3ec" />
      {wheel(88, 44, lf.color)}{wheel(222, 44, rf.color)}
      {wheel(88, 118, lr.color)}{wheel(222, 118, rr.color)}
      {[[80, 62, 77, lf, 'end'], [250, 62, 77, rf, 'start'], [80, 136, 151, lr, 'end'], [250, 136, 151, rr, 'start']].map(([x, yy, ly, c, anchor], i) => (
        <g key={i}>
          <text x={x} y={yy} textAnchor={anchor} fontSize="19" fontWeight="700" fill={c.color}>{c.low ?? '—'}</text>
          <text x={x} y={ly} textAnchor={anchor} fontSize="10.5" fill="#64748b">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── History rows ────────────────────────────────────────────────────────────

function Dots({ colors }) {
  return (
    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
      {colors.map((c, i) => (
        <span key={i} style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: DOT[c] || '#cbd5e1' }} />
      ))}
    </div>
  );
}

function visitSummary(colors) {
  const reds = colors.filter((c) => c === 'red').length;
  const yellows = colors.filter((c) => c === 'yellow').length;
  if (reds) return { text: `${reds} to replace`, color: DOT.red };
  if (yellows) return { text: `${yellows} to watch`, color: DOT.yellow };
  return { text: 'All good', color: '#64748b' };
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
      // Store not running tire checks (public.pitstop_stores) — nothing to show.
      else if (json.enabled === false) setError('Tire checks aren’t available for this visit.');
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
  const heading = { fontSize: '11px', letterSpacing: '2px', color: MAROON, fontWeight: 700 };
  const store = data?.visit?.store;
  const scan = data?.scan;
  const done = scan && scan.status !== 'in_progress';

  const tiles = done ? (scan.dually && scan.rear_pairs ? DUALLY_TIRES : TIRES) : [];
  const deepest = done ? scaleFor(scan) : FLOOR;

  // Services worth raising, gathered from the wear patterns actually found.
  const services = new Set();
  if (done) {
    tiles.forEach(({ key, pair }) => {
      const t = pair ? scan.rear_pairs?.[pair]?.[key]?.tread : scan.tires?.treads?.[key];
      const note = wearNote(t);
      if (note) services.add(note.service);
    });
  }

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
              <div style={heading}>YOUR TIRE CHECK</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                {data.visit.first_name ? `Hi ${niceName(data.visit.first_name)}` : 'Hello'}
              </div>
              <div style={{ fontSize: '14px', color: '#475569', marginTop: '2px' }}>
                {[data.visit.vehicle, formatDate(data.visit.date)].filter(Boolean).join(' · ')}
              </div>
            </div>

            {!done ? (
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
              <>
                <div style={card}>
                  <div style={{ textAlign: 'center', fontSize: '17px', fontWeight: 800, color: RATING[scan.overall_status]?.color || '#1e293b' }}>
                    {VERDICT[scan.overall_status] || 'Your tire results'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '2px', marginBottom: '10px' }}>
                    {scan.tire_size ? (scan.tire_size_rear ? `${scan.tire_size} front, ${scan.tire_size_rear} rear` : scan.tire_size) : ''}
                  </div>
                  {!scan.dually && <CarSummary scan={scan} />}
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Lowest reading at each wheel, in 32nds of an inch
                  </div>
                </div>

                <div style={card}>
                  <div style={{ ...heading, marginBottom: '2px' }}>TIRE BY TIRE</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>All tires are drawn to the same scale.</div>
                  {tiles.map(({ key, label, pair, side }) => {
                    const own = pair ? scan.rear_pairs?.[pair]?.[key] : null;
                    const t = pair ? own?.tread : scan.tires?.treads?.[key];
                    const r = RATING[pair ? own?.rating : scan.tires?.ratings?.[key]] || null;
                    const reasons = (pair ? own?.reasons : scan.tires?.reasons?.[key]) || [];
                    const note = wearNote(t);
                    return (
                      <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flexGrow: 1, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{label}</div>
                          {r && (
                            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'white', backgroundColor: r.color, padding: '4px 10px', borderRadius: '999px' }}>
                              {r.label.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <TreadProfile tread={t} color={r?.color || '#94a3b8'} deepest={deepest} side={side} />
                        {note && <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.45, marginTop: '4px' }}>{note.text}</div>}
                        {reasons.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600, marginTop: '6px' }}>
                            {reasons.map((x) => REASONS[x] || x).join(' · ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {services.size > 0 && (
                  <div style={card}>
                    <div style={{ ...heading, marginBottom: '10px' }}>WORTH ASKING ABOUT</div>
                    {services.has('alignment') && (
                      <div style={{ marginBottom: services.has('pressure') ? '10px' : 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Alignment check</div>
                        <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>One edge is wearing faster than the rest of the tread.</div>
                      </div>
                    )}
                    {services.has('pressure') && (
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Tire pressure</div>
                        <div style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.45 }}>The wear across the tread suggests the pressure is off.</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {data.quotes?.length > 0 && (
              <div style={card}>
                <div style={{ ...heading, marginBottom: '8px' }}>YOUR TIRE QUOTE</div>
                {data.quotes.map((q) => (
                  <a key={q.short_code} href={`#/quote/${q.short_code}`} style={{ display: 'block', textAlign: 'center', backgroundColor: PURPLE, color: 'white', borderRadius: '24px', padding: '12px', fontWeight: 700, textDecoration: 'none', marginBottom: '6px' }}>
                    View your quote →
                  </a>
                ))}
              </div>
            )}

            {(data.history?.length > 0 || data.visit_history?.length > 0) && (
              <div style={card}>
                {/* Not "tread depth": the prior-visit rows are a colour per tire from the bay
                    inspection, with no measurement behind them. Only a scanned visit has depths. */}
                <div style={{ ...heading, marginBottom: '10px' }}>TIRE CONDITION FROM PRIOR VISITS</div>

                {(data.history || []).map((h, i) => (
                  <div key={`s${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid #eef2f7' }}>
                    <div style={{ width: '104px', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{formatDate(h.scanned_at)}</div>
                    </div>
                    <div style={{ flexGrow: 1, textAlign: 'right', fontSize: '12px', fontWeight: 700, color: RATING[h.overall_status]?.color || '#64748b' }}>
                      {RATING[h.overall_status]?.label || ''}
                    </div>
                  </div>
                ))}

                {(data.visit_history || []).map((v, i, arr) => {
                  const s = visitSummary(v.colors);
                  return (
                    <div key={`v${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #eef2f7' : 'none' }}>
                      <div style={{ width: '104px', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{formatDay(v.date)}</div>
                        {v.mileage && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{v.mileage.toLocaleString()} mi</div>}
                      </div>
                      <Dots colors={v.colors} />
                      <div style={{ flexGrow: 1, textAlign: 'right', fontSize: '12px', fontWeight: 600, color: s.color }}>{s.text}</div>
                    </div>
                  );
                })}

                {data.visit_history?.length > 0 && (
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eef2f7', lineHeight: 1.5 }}>
                    One visit per row, one dot per tire.
                  </div>
                )}
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
