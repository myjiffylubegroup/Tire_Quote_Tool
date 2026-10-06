// =============================================================================
// NoticeBanner.jsx — ops notices posted from the database
// =============================================================================
// Ported from greets/src/staff/NoticeBanner.tsx. Shows every live row in
// `staff_notices` (greets-supabase migration 0091) under the Navbar, so an
// outage notice can go up and come down from SQL without a deploy. The first
// one (2026-10-06): AT&T guests not receiving GREETS check-in codes.
//
// Navbar renders this for signed-in staff only — Tire Finder is also
// customer-facing, and these notices are written for crews.
//
// The table's RLS policy returns only live rows, so the filter here is just
// "this store or every store". Re-polls so a notice taken down in SQL leaves
// screens that stay open all day. Any error means no banner.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { REST_BASE, SUPABASE_ANON_KEY } from './config';
import { getStaffStoreId } from './StaffPinGate';

const POLL_MS = 3 * 60 * 1000;

const STYLES = {
  info:     { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a', icon: 'ℹ️' },
  warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#78350f', icon: '⚠️' },
  critical: { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: '🚨' },
};

export default function NoticeBanner() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    let alive = true;
    const storeId = getStaffStoreId();

    const load = async () => {
      try {
        const res = await fetch(
          `${REST_BASE}/staff_notices?select=id,message,severity,store_id&order=created_at.desc`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
        );
        if (!res.ok) return;
        const rows = await res.json();
        if (!alive || !Array.isArray(rows)) return;
        setNotices(rows.filter((n) => n.store_id == null || String(n.store_id) === String(storeId)));
      } catch { /* no banner */ }
    };

    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (notices.length === 0) return null;

  return (
    <>
      {notices.map((n) => {
        const s = STYLES[n.severity] ?? STYLES.warning;
        return (
          <div key={n.id} role="alert" style={{ background: s.bg, borderBottom: `1px solid ${s.border}` }}>
            <div style={{
              maxWidth: '1300px', margin: '0 auto', padding: '11px 20px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <span aria-hidden="true" style={{ fontSize: '20px' }}>{s.icon}</span>
              <div style={{ flex: '1 1 auto', fontSize: '14px', color: s.text, lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                {n.message}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
