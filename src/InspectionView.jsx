// InspectionView.jsx
// #/inspection/<short_code> — the inspection itself, laid out to be printed and handed to a guest.
//
// This route used to go straight into the quote builder, so there was no way to simply look at an
// inspection: clicking one in the Inspections list started a quote (Sean, 2026-09-24). Quoting now
// lives at #/inspection/<code>/quote, one button away.
//
// The sheet replaces the printed TredSpec page. Same idea — a tread profile per tire, with what
// the shape of the wear means — but it knows whose car it is, which that sheet never did.
//
// Staff-only (wrapped in StaffPinGate in App.jsx), so unlike the guest page it shows the customer
// and the plate.

import React, { useCallback, useEffect, useState } from 'react';
import { apiCall } from './apiClient';
import { API_BASE } from './config';
import {
  RATING, VERDICT, REASONS,
  scaleFor, wearNote, rotationVerdict,
  TreadProfile, CarSummary,
  reportFromHandoff, tilesFor, tileData, lowestOf,
  StoppingDistance, AAA_TEST_DEPTH,
} from './treadReport';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';
const MAROON = '#8b1538';
const PURPLE = '#9b59b6';

// Ink, paper and the browser's own header/footer are the printer's business; everything that is
// only useful on a screen is marked no-print and disappears.
const PRINT_CSS = `
@media print {
  @page { size: letter portrait; margin: 0.4in; }
  body { background: white !important; }

  /* Browsers drop background colours when printing by default, which took the status chips,
     the rating colours and the stopping-distance bars off the page — the whole point of it. */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  .no-print { display: none !important; }
  .sheet {
    box-shadow: none !important; border: none !important;
    margin: 0 !important; padding: 0 !important; max-width: none !important; border-radius: 0 !important;
  }

  /* One page. The screen can breathe; paper cannot. */
  .card { padding: 10px !important; margin-bottom: 8px !important; border-radius: 6px !important; }
  .tiles { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
  .tile { break-inside: avoid; page-break-inside: avoid; padding: 8px !important; }
  .car { max-width: 250px !important; }
  h1, h2, .heading { margin-bottom: 6px !important; }
}
`;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });
}

function niceName(n) {
  return String(n || '').toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function formatPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p || '';
}

function Field({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{children}</div>
    </div>
  );
}

export default function InspectionView({ code }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`${API_BASE}/get-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_code: code }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error || 'We couldn’t find that inspection.');
      else {
        setData(json);
        setError(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const insp = data?.inspection;
  const report = data?.handoff ? reportFromHandoff(data.handoff) : null;
  const tiles = report ? tilesFor(report) : [];
  const deepest = report ? scaleFor(report) : 6;
  const rotation = report ? rotationVerdict(report) : null;

  // The worst tire on the car decides whether AAA's tested figure applies at all.
  const lowestOnCar = report
    ? tiles.reduce((worst, tile) => {
        const low = lowestOf(tileData(report, tile).tread);
        return low === null ? worst : worst === null ? low : Math.min(worst, low);
      }, null)
    : null;

  const services = new Set();
  if (report) {
    tiles.forEach((tile) => {
      const note = wearNote(tileData(report, tile).tread);
      if (note) services.add(note.service);
    });
  }

  const v = insp?.vehicle;
  const vehicle = v ? (v.display || [v.year, v.make, v.model].filter(Boolean).join(' ')) : null;

  const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '18px', marginBottom: '14px', border: '1px solid #e2e8f0' };
  const heading = { fontSize: '11px', letterSpacing: '2px', color: MAROON, fontWeight: 700, marginBottom: '10px' };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '12px' }}>
      <style>{PRINT_CSS}</style>
      <div className="sheet" style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: 'white', borderRadius: '14px', boxShadow: '0 2px 14px rgba(0,0,0,0.06)', padding: '22px' }}>

        <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <a href="#/quotes" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '14px', padding: '10px 4px', flexGrow: 1 }}>← Back</a>
          <button onClick={() => window.print()} style={{ border: `2px solid ${MAROON}`, color: MAROON, backgroundColor: 'white', borderRadius: '22px', padding: '10px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
            Print
          </button>
          <a href={`#/inspection/${encodeURIComponent(code)}/quote`} style={{ backgroundColor: PURPLE, color: 'white', borderRadius: '22px', padding: '11px 24px', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }}>
            Start quote →
          </a>
        </div>

        {loading && !data && <div style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>Loading inspection…</div>}
        {error && <div style={{ textAlign: 'center', color: '#b91c1c', padding: '30px' }}>{error}</div>}

        {data && insp && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderBottom: `3px solid ${MAROON}`, paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <img src={JL_LOGO} alt="Jiffy Lube Multicare" style={{ height: '34px' }} />
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{data.store?.name || `Jiffy Lube #${insp.store_id}`}</div>
                  {data.store?.address && <div>{data.store.address}</div>}
                  {(data.store?.city || data.store?.state) && (
                    <div>{[data.store.city, data.store.state].filter(Boolean).join(', ')} {data.store.zip || ''}</div>
                  )}
                  {data.store?.phone && <div>{formatPhone(data.store.phone)}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#475569' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>Tire Inspection</div>
                <div>{formatDate(insp.finalized_at || insp.created_at)}</div>
                <div>#{insp.short_code}{insp.finalized_by_username ? ` · ${insp.finalized_by_username}` : ''}</div>
              </div>
            </div>

            <div className="card" style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
              <Field label="Vehicle">{vehicle}</Field>
              <Field label="Plate">{v?.plate ? `${v.plate}${v.plate_state ? ` · ${v.plate_state}` : ''}` : null}</Field>
              <Field label="VIN">{v?.vin}</Field>
              <Field label="Customer">{data.customer?.full_name ? niceName(data.customer.full_name) : null}</Field>
              <Field label="Phone">{data.customer?.phone ? formatPhone(data.customer.phone) : null}</Field>
              <Field label="Check-in">{data.greet?.short_code ? `#${data.greet.short_code}` : null}</Field>
            </div>

            <div className="card" style={cardStyle}>
              <div style={{ textAlign: 'center', fontSize: '19px', fontWeight: 800, color: RATING[insp.overall_status]?.color || '#1e293b' }}>
                {VERDICT[insp.overall_status] || 'Tire results'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '2px', marginBottom: '10px' }}>
                {report?.tire_size ? (report.tire_size_rear ? `${report.tire_size} front, ${report.tire_size_rear} rear` : report.tire_size) : ''}
              </div>
              {report && !report.dually && <div className="car" style={{ maxWidth: '360px', margin: '0 auto' }}><CarSummary report={report} /></div>}
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>Lowest reading at each wheel, in 32nds of an inch</div>
            </div>

            <div className="card" style={cardStyle}>
              <div className="heading" style={heading}>TIRE BY TIRE</div>
              <div className="tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                {tiles.map((tile) => {
                  const { label, side } = tile;
                  const { tread: t, rating, reasons } = tileData(report, tile);
                  const r = RATING[rating] || null;
                  const note = wearNote(t);
                  return (
                    <div className="tile" key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
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
            </div>

            {lowestOnCar !== null && lowestOnCar <= AAA_TEST_DEPTH && (
              <div className="card" style={cardStyle}>
                <div className="heading" className="heading" style={heading}>STOPPING DISTANCE</div>
                <StoppingDistance lowest={lowestOnCar} />
              </div>
            )}

            {rotation && (
              <div className="card" style={cardStyle}>
                <div className="heading" style={heading}>TIRE ROTATION</div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{rotation.text}</div>
              </div>
            )}

            {services.size > 0 && (
              <div className="card" style={cardStyle}>
                <div className="heading" style={heading}>WORTH ASKING ABOUT</div>
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

            {data.quotes?.length > 0 && (
              <div className="no-print" className="card" style={cardStyle}>
                <div className="heading" style={heading}>QUOTES FROM THIS INSPECTION</div>
                {data.quotes.map((q) => (
                  <a key={q.short_code} href={`#/quote/${q.short_code}`} style={{ display: 'block', color: MAROON, fontWeight: 700, textDecoration: 'none', padding: '4px 0' }}>
                    #{q.short_code} →
                  </a>
                ))}
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '14px' }}>
              Measured with Jiffy Pitstop · Store {insp.store_id} · #{insp.short_code}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
