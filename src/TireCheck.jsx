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
import {
  RATING, VERDICT, REASONS, FLOOR,
  scaleFor, wearNote, rotationVerdict,
  TreadProfile, CarSummary,
  tilesFor, tileData,
} from './treadReport';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';
const MAROON = '#8b1538';
const PURPLE = '#9b59b6';

const DOT = { red: '#dc2626', yellow: '#eab308', green: '#16a34a' };

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

/** The rotation record, as a sentence — only ever about work done here. */
function rotationHistoryLine(data) {
  const r = data.last_rotation;
  if (r) {
    if (typeof r.miles_since === 'number') {
      return `Last rotated with us ${r.miles_since.toLocaleString()} miles ago, on ${formatDay(r.date)}.`;
    }
    return `Last rotated with us on ${formatDay(r.date)}.`;
  }
  const visits = data.rotation_visits_checked || 0;
  if (visits >= 2) return `No rotation on your last ${visits} visits with us.`;
  return null;
}

/** get-tire-check's scan, in the shape treadReport speaks. */
function reportOf(scan) {
  return {
    treads: scan.tires?.treads,
    ratings: scan.tires?.ratings,
    reasons: scan.tires?.reasons,
    tire_size: scan.tire_size,
    tire_size_rear: scan.tire_size_rear,
    dually: scan.dually,
    rear_pairs: scan.rear_pairs,
  };
}

// ─── History rows ────────────────────────────────────────────────────────────

const dot = (c, i) => (
  <span key={i} style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: DOT[c] || '#cbd5e1' }} />
);

/**
 * Grouped front pair then rear pair, with a gap between them. Which wheel a dot is remains
 * unknown — only its axle — so the groups are labelled and the dots inside one are not.
 */
function Dots({ colors, axles }) {
  const known = (axles || []).some((a) => a === 'front' || a === 'rear');
  if (!known) return <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>{colors.map(dot)}</div>;

  const pick = (axle) => colors.filter((_, i) => axles[i] === axle);
  const front = pick('front');
  const rear = pick('rear');
  const group = (label, cs) => cs.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <div style={{ display: 'flex', gap: '5px' }}>{cs.map(dot)}</div>
      <div style={{ fontSize: '9px', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
      {group('FRONT', front)}
      {group('REAR', rear)}
    </div>
  );
}

function visitSummary(colors, axles) {
  const flagged = colors.map((c, i) => ({ c, axle: (axles || [])[i] })).filter((x) => x.c !== 'green');
  if (!flagged.length) return { text: 'All good', color: '#64748b' };

  const reds = colors.filter((c) => c === 'red').length;
  const worst = reds ? DOT.red : '#a16207';
  // When everything flagged sits on one axle, say which — that is the part a guest can act on.
  const axlesHit = new Set(flagged.map((x) => x.axle));
  if (axlesHit.size === 1) {
    const only = [...axlesHit][0];
    if (only === 'front') return { text: 'fronts flagged', color: worst };
    if (only === 'rear') return { text: 'rears flagged', color: worst };
  }
  if (reds) return { text: `${reds} to replace`, color: DOT.red };
  return { text: `${flagged.length} to watch`, color: DOT.yellow };
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

  const report = done ? reportOf(scan) : null;
  const tiles = done ? tilesFor(report) : [];
  const deepest = done ? scaleFor(report) : FLOOR;

  const rotation = report ? rotationVerdict(report) : null;

  // Services worth raising, gathered from the wear patterns actually found.
  const services = new Set();
  if (done) {
    tiles.forEach((tile) => {
      const note = wearNote(tileData(report, tile).tread);
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
                  {!scan.dually && <CarSummary report={report} />}
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Lowest reading at each wheel, in 32nds of an inch
                  </div>
                </div>

                <div style={card}>
                  <div style={{ ...heading, marginBottom: '2px' }}>TIRE BY TIRE</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>All tires are drawn to the same scale.</div>
                  {tiles.map((tile) => {
                    const { label, side } = tile;
                    const { tread: t, rating, reasons } = tileData(report, tile);
                    const r = RATING[rating] || null;
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
                        <TreadProfile tread={t} color={r?.fill || '#cbd5e1'} deepest={deepest} side={side} />
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

                {rotation && (
                  <div style={card}>
                    <div style={{ ...heading, marginBottom: '8px' }}>TIRE ROTATION</div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                        stroke={rotation.kind === 'helps' ? '#16a34a' : '#64748b'} strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />
                      </svg>
                      <div>
                        <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{rotation.text}</div>
                        {rotationHistoryLine(data) && (
                          <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>{rotationHistoryLine(data)}</div>
                        )}
                        {/* We are the ones declining the rotation here, so the guest should hear
                            the other half: their tread warranty may still expect one. */}
                        {rotation.warranty && (
                          <div style={{ fontSize: '12.5px', color: '#8a4b00', marginTop: '6px', lineHeight: 1.45 }}>
                            Most tread warranties expect regular rotations, so ask your service advisor what yours needs.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                  const s = visitSummary(v.colors, v.axles);
                  return (
                    <div key={`v${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #eef2f7' : 'none' }}>
                      <div style={{ width: '104px', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{formatDay(v.date)}</div>
                        {v.mileage && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{v.mileage.toLocaleString()} mi</div>}
                      </div>
                      <Dots colors={v.colors} axles={v.axles} />
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
