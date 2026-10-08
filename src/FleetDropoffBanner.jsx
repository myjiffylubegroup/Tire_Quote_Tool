// =============================================================================
// FleetDropoffBanner.jsx — "N fleet drop-offs waiting" under the Navbar
// =============================================================================
// Fleet drivers check a car in by scanning the QR poster at the store
// (greets: /fleet, greets-supabase migration 0092). The crew confirms each one
// on the GREETS staff site's FLEET DROP-OFFS page. PCJL's counter lives in Tire
// Finder, not GREETS, so without this a drop-off could sit unseen (Sean,
// 2026-10-08). Mirrors FleetWaitingStrip in greets/src/staff/FleetDropoffs.tsx.
//
// Asks fleet-dropoffs-staff for the store on screen: the Navbar's selected
// store when there is one, else the signed-in employee's home store. A
// corporate login with no store picked sees nothing, as with greets-list.
// Navbar renders this for signed-in staff only. Any error means no banner.
//
// Plain fetch, NOT apiCall: apiCall signs the user out on a 401, and a side
// banner must never be the thing that logs a CSA out mid-shift.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { API_BASE, SUPABASE_ANON_KEY } from './config';
import { getStaffToken } from './apiClient';
import { getStaffStoreId } from './StaffPinGate';

const POLL_MS = 2 * 60 * 1000;
const GREETS_URL = (import.meta.env.VITE_GREETS_URL || 'https://greets.myjiffylube.ai').replace(/\/+$/, '');

export default function FleetDropoffBanner({ selectedStore }) {
  const picked = Number(selectedStore);
  const storeId = Number.isInteger(picked) && picked > 0 ? picked : Number(getStaffStoreId()) || null;
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!storeId) { setWaiting(0); return undefined; }
    let alive = true;
    const load = async () => {
      try {
        const token = getStaffToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/fleet-dropoffs-staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'X-Staff-Token': token },
          body: JSON.stringify({ action: 'list', store_id: storeId, days: 1 }),
        });
        const data = await res.json();
        if (alive && data?.success) setWaiting(data.waiting || 0);
      } catch { /* no banner */ }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [storeId]);

  if (!waiting) return null;

  return (
    <div role="status" style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d' }}>
      <a
        href={`${GREETS_URL}/dropoffs`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          maxWidth: '1300px', margin: '0 auto', padding: '11px 20px', display: 'flex', alignItems: 'center',
          gap: '14px', color: '#78350f', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '20px' }}>🚚</span>
        <span style={{ flex: '1 1 auto' }}>
          {waiting} fleet drop-off{waiting === 1 ? '' : 's'} waiting at #{storeId}: find the car and keys, then mark it received in GREETS →
        </span>
      </a>
    </div>
  );
}
