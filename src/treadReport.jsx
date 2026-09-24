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
  consider: { label: 'Consider', color: '#a16207', fill: '#eab308', bg: '#fefce8' },
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
 * The top of the plot, shared by every tire on the vehicle so they can be read against each
 * other: the deepest reading anywhere on the car, but never less than FLOOR.
 *
 * The floor is what stops a worn-out set from being flattered. Scaled purely to its own deepest
 * reading, a car with four bald tires fills every box to the top and looks no different from a
 * healthy one. A new tire is anywhere from 8/32 to 15/32 depending on the tire and we hold no
 * per-tire spec, so there is no honest fixed ceiling to use instead.
 */
export const FLOOR = 6;

export function scaleFor(report) {
  let deepest = FLOOR;
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

export function TreadProfile({ tread, color, deepest, side }) {
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
 * AAA's tested figure, not a calculation of ours.
 *
 * AAA and the Automobile Club of Southern California's Automotive Research Center compared new
 * all-season tires against tires worn to 4/32" on wet pavement at highway speed: 87 feet further
 * to stop for a passenger car, 43% longer. Braking from 60 mph, the worn set was still doing
 * nearly 40 mph where the new set had already stopped.
 *
 * It is shown only once a tire is at or below the 4/32" they tested. Above that the number does
 * not describe the car in front of us, and interpolating a curve AAA never published would be
 * inventing a safety claim.
 */
export const AAA_SOURCE = 'AAA and the Automobile Club of Southern California, 2018 — new all-season tires against tires worn to 4/32" on wet pavement.';
export const AAA_TEST_DEPTH = 4;

export function StoppingDistance({ lowest, compact = false }) {
  if (typeof lowest !== 'number' || lowest > AAA_TEST_DEPTH) return null;
  const bar = (label, width, color, caption) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: compact ? '11px' : '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
        <span>{label}</span><span>{caption}</span>
      </div>
      <div style={{ backgroundColor: '#eef2f7', borderRadius: '4px', height: compact ? '12px' : '16px' }}>
        <div style={{ width, backgroundColor: color, height: '100%', borderRadius: '4px' }} />
      </div>
    </div>
  );
  return (
    <div>
      {bar('New tires', '58%', '#16a34a', 'stopped')}
      {bar('Worn to 4/32"', '100%', '#dc2626', '87 ft further')}
      <div style={{ fontSize: compact ? '10.5px' : '11.5px', color: '#64748b', lineHeight: 1.5 }}>
        Braking from 60 mph on a wet road, tires worn to 4/32" travel 87 feet further before
        stopping — still moving at nearly 40 mph at the point new tires have stopped.
        <br />
        <span style={{ color: '#94a3b8' }}>{AAA_SOURCE}</span>
      </div>
    </div>
  );
}
