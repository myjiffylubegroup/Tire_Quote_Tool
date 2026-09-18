// InspectionCard.jsx
// One finished Jiffy Pitstop inspection in QuoteLookup's Inspections tab — the counterpart
// of GreetCard. Opening it goes to #/inspection/<code>, which pre-fills a quote (store, tire
// size, quantity, three tread readings per tire, customer) and links the quote back.

import React from 'react';

const VERDICT = {
  replace:  { label: 'REPLACE',  color: '#dc2626', bg: '#fef2f2' },
  consider: { label: 'CONSIDER', color: '#d97706', bg: '#fffbeb' },
  good:     { label: 'GOOD',     color: '#16a34a', bg: '#f0fdf4' },
};

function timeLabel(iso, withDate) {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!withDate) return time;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

export default function InspectionCard({ inspection: i, showDate = false }) {
  const verdict = VERDICT[i.overall_status] || { label: (i.overall_status || '—').toUpperCase(), color: '#64748b', bg: '#f8fafc' };
  const v = i.vehicle || {};
  const vehicle = v.display || [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';
  const size = i.tire_size_rear ? `F ${i.tire_size} · R ${i.tire_size_rear}` : i.tire_size;
  const quoted = i.quote_count > 0;
  const tireCounts = [
    i.replace_count ? `${i.replace_count} replace` : null,
    i.consider_count ? `${i.consider_count} consider` : null,
  ].filter(Boolean).join(' · ') || 'All tires good';

  const open = () => { window.location.hash = `#/inspection/${i.short_code}`; };

  return (
    <div
      onClick={open}
      style={{
        backgroundColor: 'white',
        border: '1px solid #eee',
        borderLeft: `5px solid ${verdict.color}`,
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ minWidth: '200px', flex: '1 1 260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#9b59b6', letterSpacing: '1px' }}>
            {i.short_code}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: verdict.color, backgroundColor: verdict.bg, padding: '3px 8px', borderRadius: '10px' }}>
            {verdict.label}
          </span>
          {quoted && (
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', color: '#1e40af', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '10px' }}>
              QUOTED{i.quote_count > 1 ? ` ×${i.quote_count}` : ''}
            </span>
          )}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{vehicle}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {[v.plate ? `${v.plate}${v.plate_state ? ` (${v.plate_state})` : ''}` : null, size].filter(Boolean).join(' · ') || 'No plate or size recorded'}
        </div>
      </div>

      <div style={{ flex: '0 1 200px', fontSize: '12px', color: '#475569' }}>
        <div style={{ fontWeight: 600, color: verdict.color }}>{tireCounts}</div>
        <div style={{ marginTop: '2px' }}>
          {timeLabel(i.finalized_at, showDate)}{i.finalized_by_username ? ` · ${i.finalized_by_username}` : ''}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); open(); }}
        style={{
          backgroundColor: quoted ? 'white' : '#9b59b6',
          color: quoted ? '#9b59b6' : 'white',
          border: '2px solid #9b59b6',
          padding: '9px 18px',
          borderRadius: '22px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {quoted ? 'QUOTE AGAIN →' : 'START QUOTE →'}
      </button>
    </div>
  );
}
