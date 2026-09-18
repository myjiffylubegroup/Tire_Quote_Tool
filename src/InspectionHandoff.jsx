// InspectionHandoff.jsx
// #/inspection/<short_code> — start a quote from a finished Jiffy Pitstop inspection.
//
// Fetches the inspection (get-inspection) and hands it to Tire Finder's existing re-quote
// path, which already does the rest: locks the store, sets the quantity, runs the inventory
// search for the tire size, and pre-fills tread and replacement reasons in QuoteBuilder.
// The inspection rides along as `inspection` inside jl_requote_data; TireFinder forwards it as
// jl_quote_inspection_link and QuoteBuilder sends it as inspection_id, so the quote links
// back to the inspection (tire_quotes.inspection_id) and the inspection is marked quoted.
//
// Staff-only (wrapped in StaffPinGate in App.jsx).

import React, { useEffect, useState } from 'react';
import { apiCall } from './apiClient';
import { API_BASE } from './config';

export default function InspectionHandoff({ code }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiCall(`${API_BASE}/get-inspection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ short_code: code }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) {
          setError(data.error || 'Could not open that inspection.');
          return;
        }

        const { inspection: i, handoff: h } = data;
        const requote = {
          source: 'inspection',
          inspection: { id: i.id, short_code: i.short_code },
          store_id: i.store_id,
          quantity: h.quantity,
          tire_size: h.tire_size,
          tire_size_rear: h.tire_size_rear,
          is_staggered: h.is_staggered,
          vehicle: {
            year: i.vehicle.year,
            make: i.vehicle.make,
            model: i.vehicle.model,
            submodel: i.vehicle.submodel,
            display: i.vehicle.display,
            oe_tire_size: h.tire_size,
          },
          plate: i.vehicle.plate,
          plate_state: i.vehicle.plate_state,
          vin: i.vehicle.vin,
          treads: h.treads,
          tire_replacement_reasons: h.tire_replacement_reasons,
          overall_status: i.overall_status,
          prior_quotes: data.quotes || [],
        };

        sessionStorage.setItem('jl_requote_data', JSON.stringify(requote));
        sessionStorage.setItem('jl_requote_pending', '1');
        window.location.hash = '#/';
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not open that inspection.');
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        {error ? (
          <>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Couldn't open inspection {code}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>{error}</div>
            <a href="#/quotes" style={{ color: '#9b59b6', fontWeight: 600 }}>Back to quotes</a>
          </>
        ) : (
          <div style={{ fontSize: '15px', color: '#64748b' }}>Opening inspection {code}…</div>
        )}
      </div>
    </div>
  );
}
