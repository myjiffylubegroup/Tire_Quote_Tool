// treadReport.jsx
// The tread report: the graphics and the reading of them, shared by the guest tire-check page
// (TireCheck) and the staff inspection sheet (InspectionView).
//
// Lifted out of TireCheck when the staff sheet was built. One implementation on purpose — the
// wear notes and the rotation rules are judgements about a customer's tires, and two copies
// would answer the same car differently the first time one of them was edited.
//
// Callers pass a `report`: { treads, ratings, reasons, tire_size, tire_size_rear, dually,
// rear_pairs }. get-tire-check returns that shape directly; get-inspection's `handoff` needs
// reportFromHandoff() below.

import React from 'react';

// `color` is for text and chips, where it has to carry contrast against white; `fill` is for the
// blocks — tread profiles, wheels, dots — where a brighter, yellower amber reads better and
// contrast does not apply. Yellow-700 behind white text is 5.4:1; yellow-500 would be 1.9:1.
export const RATING = {
  good: { label: 'Good', color: '#16a34a', fill: '#16a34a', bg: '#f0fdf4' },
  consider: { label: 'Consider', color: '#a16207', fill: '#f1c40f', bg: '#fefce8' },
  replace: { label: 'Replace', color: '#dc2626', fill: '#dc2626', bg: '#fef2f2' },
};


export const VERDICT = {
  good: 'Your tires look good',
  consider: 'Some tires to keep an eye on',
  replace: 'We recommend replacing some tires',
};

// Walk order, driver's front then counter-clockwise (Tire Finder positions). `side` decides which
// end of the profile is the outside edge: on the driver's side you are looking at the tire from
// the left of the car, on the passenger side from the right.
export const TIRES = [
  { key: 'lf', label: "Driver's front", side: 'driver' },
  { key: 'lr', label: "Driver's rear", side: 'driver' },
  { key: 'rr', label: 'Passenger rear', side: 'passenger' },
  { key: 'rf', label: 'Passenger front', side: 'passenger' },
];

// Dually: six tires. The rear corners in `tires` are the worse of each pair, so the rear tiles
// read each tire on its own from rear_pairs.
export const DUALLY_TIRES = [
  { key: 'lf', label: "Driver's front", side: 'driver' },
  { key: 'lr', label: "Driver's rear outer", pair: 'outer', side: 'driver' },
  { key: 'lr', label: "Driver's rear inner", pair: 'inner', side: 'driver' },
  { key: 'rr', label: 'Passenger rear inner', pair: 'inner', side: 'passenger' },
  { key: 'rr', label: 'Passenger rear outer', pair: 'outer', side: 'passenger' },
  { key: 'rf', label: 'Passenger front', side: 'passenger' },
];

export const REASONS = {
  age: 'Over 10 years old',
  uneven_wear: 'Uneven wear',
  sidewall_damage: 'Sidewall damage',
  tread_damage: 'Tread damage',
};


// ─── Reading the tread ───────────────────────────────────────────────────────

export function readingsOf(t) {
  return [t?.inside, t?.middle, t?.outside].filter((v) => typeof v === 'number');
}

export function lowestOf(t) {
  const vals = readingsOf(t);
  return vals.length ? Math.min(...vals) : null;
}

/**
 * The top of the plot: the height the tire's outline is drawn at, shared by every tire on the
 * vehicle so they can be read against each other.
 *
 * Now that the outline is a whole tire and the fill stops where the rubber stops, the gap between
 * them reads as "this much has worn away" — so the outline has to stand at a full tread, not at
 * whatever the best tire on this car happens to be. Floored at FULL_TREAD: a car whose four tires
 * are all at 5/32 must not draw four nearly-full tires.
 *
 * FULL_TREAD is a reference, not a measurement. New tires run from about 8/32 to 15/32 depending
 * on the tire and we hold no per-tire spec, so 10/32 is a common, conservative stand-in: it
 * understates wear on a deeper tire rather than overstating it. A tire measuring more than that
 * simply sets its own ceiling.
 */
const FULL_TREAD = 10;
export const FLOOR = FULL_TREAD;

export function scaleFor(report) {
  let deepest = FULL_TREAD;
  const eat = (t) => readingsOf(t).forEach((v) => { if (v > deepest) deepest = v; });
  Object.values(report?.treads || {}).forEach(eat);
  ['outer', 'inner'].forEach((p) => Object.values(report?.rear_pairs?.[p] || {}).forEach((x) => eat(x?.tread)));
  return deepest;
}

/**
 * What the shape of the wear means. Derived from the three readings, never invented: a shoulder
 * that is well below the middle is the classic under-inflation pattern, one shoulder alone points
 * at alignment, and a low middle is over-inflation.
 */
const GAP = 1.5;   // 32nds between middle and a shoulder before it counts as a pattern

export function wearNote(t) {
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

/**
 * Would a rotation help this car?
 *
 * The kiosk promises it outright — "one of the first things we do is measure your tread depth. If
 * you choose a rotation and your tires won't benefit from it, we'll let you know." This page shows
 * the guest the only measurement we take, so it is where that promise lands.
 *
 * Two rules from Sean (2026-09-24), in this order:
 *
 * 1. THE BEST TIRES BELONG ON THE REAR. A front-to-rear rotation moves today's fronts to the back,
 *    so it only helps when the fronts are the deeper pair. When the REARS are already deeper,
 *    rotating would put the more worn tires on the axle that lets go first in the wet — so the
 *    answer is no, however uneven the wear looks. Safety outranks evening out the set.
 * 2. Rotate BEFORE there is a problem. Within 1/32" the tires are wearing together and the answer
 *    is to stay the course — keep to the schedule, not skip it. (An earlier draft said a rotation
 *    "wouldn't change much today", which reads as permission to skip one and quietly argues
 *    against the warranty the kiosk two screens earlier tells them to protect.)
 *
 * Edge wear is only allowed to call for a rotation while the depths are level, where rule 1 can't
 * be broken either way. A single low edge stays an alignment matter, raised by the per-tire notes:
 * rotating a misaligned car moves the problem to a different corner rather than fixing it.
 */
const EVEN_32NDS = 1;     // depth difference between the axles before a rotation is worth doing
const EDGE_32NDS = 1;     // extra shoulder wear on the front axle before it counts on its own

export const CORNERS = ['lf', 'rf', 'lr', 'rr'];

// How far the shoulders have dropped below the middle of one tire.
export function edgeWearOf(t) {
  const { inside, middle, outside } = t || {};
  if (typeof inside !== 'number' || typeof middle !== 'number' || typeof outside !== 'number') return null;
  return Math.max(0, middle - Math.min(inside, outside));
}

export function rotationVerdict(report) {
  if (report.dually) return null;                       // six tires; not this diagram's problem
  if (report.tire_size_rear && report.tire_size_rear !== report.tire_size) {
    return {
      kind: 'sizes',
      warranty: true,
      text: 'Your front and rear tires are different sizes, so they can\u2019t be rotated front to back.',
    };
  }

  const treads = report.treads || {};
  const lows = Object.fromEntries(CORNERS.map((k) => [k, lowestOf(treads[k])]));
  if (CORNERS.some((k) => lows[k] === null)) return null;

  const ratings = report.ratings || {};
  if (CORNERS.some((k) => ratings[k] === 'replace')) {
    return { kind: 'replace', text: 'With tires this worn, a rotation won\u2019t bring the tread back. Replacing them is the fix.' };
  }

  const front = (lows.lf + lows.rf) / 2;
  const rear = (lows.lr + lows.rr) / 2;
  const gap = Math.round(Math.abs(front - rear) * 10) / 10;

  // Rule 1 — rears already deeper: rotating would move the worse pair to the back.
  if (rear - front > EVEN_32NDS) {
    return {
      kind: 'hold',
      warranty: true,
      text: `Your rear tires have about ${gap}/32" more tread than the fronts, and the deeper pair belongs on the back. Rotating would move your more worn tires there, so we\u2019d leave them where they are.`,
    };
  }

  // Rule 1 the other way — fronts deeper: a rotation puts the better pair on the back.
  if (front - rear > EVEN_32NDS) {
    return {
      kind: 'helps',
      text: `Your front tires have about ${gap}/32" more tread than the rears. Rotating moves the deeper pair to the back where it belongs and evens the set out.`,
    };
  }

  // Depths are level, so either direction is safe — shoulder wear can decide.
  const edges = Object.fromEntries(CORNERS.map((k) => [k, edgeWearOf(treads[k])]));
  const pairAvg = (a, b) => (edges[a] === null || edges[b] === null ? null : (edges[a] + edges[b]) / 2);
  const frontEdge = pairAvg('lf', 'rf');
  const rearEdge = pairAvg('lr', 'rr');
  if (frontEdge !== null && rearEdge !== null && frontEdge - rearEdge >= EDGE_32NDS) {
    return {
      kind: 'helps',
      text: 'Your front tires are wearing down at the edges faster than the rears. Rotating them now evens that out before it costs you tread.',
    };
  }

  return {
    kind: 'even',
    text: 'Your tires are within 1/32" of each other, so they\u2019re wearing evenly \u2014 keep to your normal rotation schedule and they\u2019ll stay that way.',
  };
}


// ─── The tread profile ───────────────────────────────────────────────────────

const BASE = 84;
const TOP = 28;

/**
 * One tire, drawn the way the printed sheet draws one: the whole tread pattern in black outline
 * at full depth, then filled with colour only as far up as the rubber that is actually left. The
 * empty space between the fill and the outline is what has worn away, which is the thing a guest
 * understands without being told (Sean, 2026-09-24).
 *
 * Earlier versions drew the fill and outlined the fill, so there was no reference shape for a worn
 * tire to fall short of and it read as a bar chart.
 *
 * Wear bars stand in the groove floors at 2/32, part of the outline like everything else. A tire
 * at 2/32 fills flush with them and its grooves disappear — the same thing a tech points at on
 * the car.
 *
 * The groove PATTERN is generic: four grooves on every tire whatever it really has, carrying no
 * information. The HEIGHTS are the measurement — the fill surface is interpolated across the three
 * readings the scanner returns. The outline stands at the top of the scale, which is the deepest
 * reading on this vehicle (never under 6/32), NOT a claim about what this tire measured new: a new
 * tire is anywhere from 8/32 to 15/32 and we hold no per-tire spec.
 */
export function TreadProfile({ tread, color, deepest, side }) {
  const clipId = React.useId();
  const TOP = 24, CARCASS_TOP = 82, CARCASS_BOT = 93;
  const X0 = 16, X1 = 314, GROOVE_W = 10;
  const GROOVES = [64, 122, 208, 266];
  const READ = [58, 165, 272];
  const CROWN = 3.5, SHOULDER = 30, DROP = 7;

  const scale = (CARCASS_TOP - TOP) / deepest;
  const depthAt = (d) => CARCASS_TOP - d * scale;

  const [l, m, r] = side === 'driver'
    ? [tread?.outside, tread?.middle, tread?.inside]
    : [tread?.inside, tread?.middle, tread?.outside];
  const leftLabel = side === 'driver' ? 'OUTSIDE' : 'INSIDE';
  const rightLabel = side === 'driver' ? 'INSIDE' : 'OUTSIDE';
  const have = [l, m, r].every((v) => typeof v === 'number');

  // The crown falls away toward each shoulder. Applied to the outline and the fill alike, so an
  // evenly worn tire's surface sits parallel to the pattern above it.
  const centre = (X0 + X1) / 2, half = (X1 - X0) / 2;
  const contour = (x) => {
    let d = CROWN * Math.pow(Math.abs(x - centre) / half, 2);
    if (x < X0 + SHOULDER) d += DROP * Math.pow((X0 + SHOULDER - x) / SHOULDER, 2);
    if (x > X1 - SHOULDER) d += DROP * Math.pow((x - (X1 - SHOULDER)) / SHOULDER, 2);
    return d;
  };
  const measured = (x) => {
    let y;
    if (x <= READ[0]) y = depthAt(l);
    else if (x >= READ[2]) y = depthAt(r);
    else if (x <= READ[1]) y = depthAt(l) + ((x - READ[0]) / (READ[1] - READ[0])) * (depthAt(m) - depthAt(l));
    else y = depthAt(m) + ((x - READ[1]) / (READ[2] - READ[1])) * (depthAt(r) - depthAt(m));
    return Math.min(y + contour(x), CARCASS_TOP);
  };

  // ── The tire, at full depth: tread blocks, then a wear bar standing in each groove.
  const wearY = depthAt(2);
  const outline = [`M ${X0} ${CARCASS_TOP}`, `L ${X0} ${(TOP + contour(X0)).toFixed(1)}`];
  GROOVES.forEach((gx) => {
    outline.push(
      `L ${gx} ${(TOP + contour(gx)).toFixed(1)}`, `L ${gx} ${CARCASS_TOP}`,
      `L ${gx + GROOVE_W} ${CARCASS_TOP}`, `L ${gx + GROOVE_W} ${(TOP + contour(gx + GROOVE_W)).toFixed(1)}`,
    );
  });
  outline.push(`L ${X1} ${(TOP + contour(X1)).toFixed(1)}`, `L ${X1} ${CARCASS_TOP}`, 'Z');
  const bars = GROOVES.map((gx) =>
    `M ${gx} ${CARCASS_TOP} L ${gx} ${wearY.toFixed(1)} L ${gx + GROOVE_W} ${wearY.toFixed(1)} L ${gx + GROOVE_W} ${CARCASS_TOP} Z`);
  const tirePath = [...outline, ...bars].join(' ');

  // ── What is left: everything below the measured surface, clipped to the tire above.
  const step = 6;
  const fill = [`M ${X0} ${CARCASS_TOP}`];
  for (let x = X0; x <= X1; x += step) fill.push(`L ${x} ${measured(x).toFixed(1)}`);
  fill.push(`L ${X1} ${measured(X1).toFixed(1)}`, `L ${X1} ${CARCASS_TOP}`, 'Z');

  return (
    <svg viewBox="0 0 330 126" style={{ width: '100%', height: 'auto', marginTop: '6px' }} role="img"
      aria-label={have ? `Tread readings ${l}, ${m} and ${r} thirty-seconds of an inch across the tire; wear bars sit at 2/32.` : 'Tread readings not available for this tire.'}>
      <defs>
        <clipPath id={clipId}><path d={tirePath} /></clipPath>
      </defs>

      <text x="10" y="12" fontSize="10.5" letterSpacing="1.3" fill="#94a3b8" fontWeight="700">{leftLabel}</text>
      <text x="320" y="12" textAnchor="end" fontSize="10.5" letterSpacing="1.3" fill="#94a3b8" fontWeight="700">{rightLabel}</text>

      <rect x={X0} y={CARCASS_TOP} width={X1 - X0} height={CARCASS_BOT - CARCASS_TOP} rx="3" fill="#3f4854" />

      {/* The rubber that is left, poured into the tire's own shape */}
      {have && <g clipPath={`url(#${clipId})`}><path d={fill.join(' ')} fill={color} /></g>}

      {/* The tire itself, on top, so the outline reads whole however little is left in it */}
      <path d={tirePath} fill="none" stroke="#1e293b" strokeWidth="1.1" strokeLinejoin="round" />
      <line x1={X0} y1={wearY} x2={X1} y2={wearY} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.45" />

      {have && READ.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={CARCASS_BOT + 9} x2={x} y2={CARCASS_BOT + 3} stroke="#475569" strokeWidth="1" />
          <path d={`M ${x} ${CARCASS_BOT + 1} l -2.6 4 l 5.2 0 Z`} fill="#475569" />
        </g>
      ))}
      {[l, m, r].map((v, i) => (
        <text key={i} x={READ[i]} y="115" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">
          {typeof v === 'number' ? v : '—'}
        </text>
      ))}
      <text x="165" y="124" textAnchor="middle" fontSize="8.5" fill="#94a3b8">
        tread depth in 32nds · wear bars at 2/32
      </text>
    </svg>
  );
}

// ─── The car ─────────────────────────────────────────────────────────────────
// Lowest reading at each wheel, laid out as the car sits. Skipped for duallies, which have six
// tires and do not fit this diagram.

export function CarSummary({ report }) {
  const corner = (key) => {
    const t = report.treads?.[key];
    const r = RATING[report.ratings?.[key]] || null;
    return { low: lowestOf(t), color: r?.color || '#94a3b8', fill: r?.fill || '#cbd5e1', label: r?.label || '' };
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
      {wheel(88, 44, lf.fill)}{wheel(222, 44, rf.fill)}
      {wheel(88, 118, lr.fill)}{wheel(222, 118, rr.fill)}
      {[[80, 62, 77, lf, 'end'], [250, 62, 77, rf, 'start'], [80, 136, 151, lr, 'end'], [250, 136, 151, rr, 'start']].map(([x, yy, ly, c, anchor], i) => (
        <g key={i}>
          <text x={x} y={yy} textAnchor={anchor} fontSize="19" fontWeight="700" fill={c.color}>{c.low ?? '—'}</text>
          <text x={x} y={ly} textAnchor={anchor} fontSize="10.5" fill="#64748b">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}


// ─── Adapters ────────────────────────────────────────────────────────────────

/** get-inspection returns `handoff`; get-tire-check returns the same facts already shaped. */
export function reportFromHandoff(h) {
  if (!h) return null;
  return {
    treads: h.treads,
    ratings: h.ratings,
    reasons: h.tire_replacement_reasons,
    tire_size: h.tire_size,
    tire_size_rear: h.tire_size_rear,
    dually: h.dually,
    rear_pairs: h.dually ? { outer: h.outer, inner: h.inner } : null,
  };
}

/** The tiles to draw, and which way round each profile reads. */
export function tilesFor(report) {
  return report?.dually && report.rear_pairs ? DUALLY_TIRES : TIRES;
}

/** One tile's tread, rating and reasons, whichever shape it came from. */
export function tileData(report, { key, pair }) {
  const own = pair ? report.rear_pairs?.[pair]?.[key] : null;
  return {
    tread: pair ? own?.tread : report.treads?.[key],
    rating: pair ? own?.rating : report.ratings?.[key],
    reasons: (pair ? own?.reasons : report.reasons?.[key]) || [],
  };
}

// ─── Stopping distance ───────────────────────────────────────────────────────

/**
 * The same chart the quote view draws, from the same numbers.
 *
 * The distances are not computed here and never should be: they come from quote_config's
 * tread_depth_chart (new 195ft, good 220, consider 290, replace 378 at 60 mph on a wet road),
 * which the business sets and get-quote and get-inspection both read. A guest who sees this sheet
 * and then a quote minutes later must not be given two different answers about the same tires.
 */
export function StoppingDistance({ currentFt, newFt = 195 }) {
  // Nothing to say when the tires are already in the top band: two identical bars and no
  // saving is noise on a staff sheet and a soft upsell on a guest's page.
  if (!currentFt || currentFt <= newFt) return null;
  const MAX = 400;
  const difference = currentFt - newFt;
  const row = (label, ft, pct, track, fill) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: 700, width: '70px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '14px', borderRadius: '4px', overflow: 'hidden', backgroundColor: track }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', backgroundColor: fill }} />
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, width: '42px', flexShrink: 0, textAlign: 'right', color: fill }}>{ft} ft</div>
    </div>
  );
  return (
    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#1e293b', letterSpacing: '1px', textAlign: 'center', marginBottom: '8px' }}>
        STOPPING DISTANCE (60 MPH, WET ROAD)
      </div>
      {row('Current', currentFt, (currentFt / MAX) * 100, '#fee2e2', '#dc2626')}
      {row('New Tires', newFt, (newFt / MAX) * 100, '#dcfce7', '#16a34a')}
      {difference > 0 && (
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '7px 10px', textAlign: 'center', fontSize: '11.5px', color: '#1e293b', fontWeight: 500, marginTop: '8px' }}>
          New tires could reduce your stopping distance by <strong>{difference} feet</strong> — about{' '}
          <strong>{(difference / 15).toFixed(1)} car lengths</strong>!
        </div>
      )}
    </div>
  );
}
