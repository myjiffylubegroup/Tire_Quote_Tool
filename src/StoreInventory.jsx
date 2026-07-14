import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { apiCall, isStaffAuthenticated } from './apiClient';
import StaffLoginForm from './StaffLoginForm';
import { getStaffEmployee } from './StaffPinGate';

import { API_BASE } from './config';
const API_KEY = 'TIRES2026';

// Store list with city names - matches TireFinder
const STORES = [
  { id: 609, name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

// Usage-by-size report: stores in North->South column order (matches the legacy
// ClicData "Sales by Size" layout). `key` maps to get_sales_by_size() columns.
const USAGE_STORES = [
  { id: 2911, key: 's2911', name: 'Paso Robles' },
  { id: 1932, key: 's1932', name: 'Atascadero' },
  { id: 1002, key: 's1002', name: 'San Luis Obispo' },
  { id: 1270, key: 's1270', name: 'Arroyo Grande' },
  { id: 609,  key: 's609',  name: 'Santa Maria' },
  { id: 1257, key: 's1257', name: 'Goleta' },
  { id: 4182, key: 's4182', name: 'SB (Upper State)' },
  { id: 1396, key: 's1396', name: 'SB (Downtown)' },
];

// Local-date ISO helpers (YYYY-MM-DD) for the usage date range.
function isoToday() {
  return new Date().toISOString().split('T')[0];
}
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// Parse a physical count out of a location string.
// Sums the leading integer of each comma-separated segment:
//   "4-R2"          -> 4
//   "2-R2, 2-UBR1"  -> 4
//   "R2"            -> null  (no number to compare)
//   ""/null         -> null
function parsePhysicalCount(locationText) {
  if (!locationText) return null;
  const segments = String(locationText).split(',');
  let total = 0;
  let found = false;
  for (const seg of segments) {
    const m = seg.trim().match(/^(\d+)/);
    if (m) {
      total += parseInt(m[1], 10);
      found = true;
    }
  }
  return found ? total : null;
}

// Escape values before injecting into the print document's HTML.
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format an ISO/timestamptz value as a short "Mon D" date for printed sheets.
// A printed sheet gets carried around, so an absolute date stays correct where
// a relative "3d ago" would go stale.
function formatShortDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Summary card component. `accent='red'` is used for the Out of Stock tile so
// it reads as an alert when there are depleted SKUs.
const SummaryCard = ({ label, value, subtext, accent }) => {
  const bg = accent === 'red' ? '#fdecea' : '#f3e8ff';
  const valueColor = accent === 'red' ? '#c0392b' : '#9b59b6';
  return (
    <div style={{
      backgroundColor: bg,
      padding: '15px 25px',
      borderRadius: '10px',
      textAlign: 'center',
      minWidth: '120px',
    }}>
      <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: valueColor }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

export default function StoreInventory() {
  const [selectedStore, setSelectedStore] = useState('');
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showCost, setShowCost] = useState(true);
  const [sortField, setSortField] = useState('tire_size');
  const [sortDirection, setSortDirection] = useState('asc');

  // --- Location editing state ---
  const [editMode, setEditMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [drafts, setDrafts] = useState({});       // store_item_id -> in-progress text
  const [rowStatus, setRowStatus] = useState({}); // store_item_id -> 'saving' | 'saved' | 'error'

  // --- Usage-by-size (group-wide units sold) view state ---
  // Group scope ('GROUP' from the store selector) drives the Usage view;
  // any individual store id drives the On Hand (QOH) view.
  const isGroup = selectedStore === 'GROUP';
  const [usageFrom, setUsageFrom] = useState(isoDaysAgo(6));
  const [usageTo, setUsageTo] = useState(isoToday());
  const [usageRows, setUsageRows] = useState([]);
  const [usageExceptions, setUsageExceptions] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState(null);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [showExceptions, setShowExceptions] = useState(false);

  // Fetch inventory when store changes
  useEffect(() => {
    if (!selectedStore || selectedStore === 'GROUP') {
      setInventory([]);
      setSummary(null);
      return;
    }

    const fetchInventory = async () => {
      setLoading(true);
      setError(null);
      // Reset any in-progress edit state when switching stores.
      setDrafts({});
      setRowStatus({});

      try {
        const response = await fetch(
          `${API_BASE}/store-inventory?store_id=${selectedStore}&key=${API_KEY}`
        );
        const data = await response.json();

        if (data.success) {
          setInventory(data.data);
          setSummary(data.summary);
        } else {
          setError(data.error || 'Failed to load inventory');
        }
      } catch (e) {
        setError('Failed to connect to server');
      }

      setLoading(false);
    };

    fetchInventory();
  }, [selectedStore]);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      (item.description && item.description.toLowerCase().includes(search)) ||
      (item.tire_size && item.tire_size.toLowerCase().includes(search)) ||
      (item.brand && item.brand.toLowerCase().includes(search)) ||
      (item.item_code && item.item_code.toLowerCase().includes(search)) ||
      (item.location_text && item.location_text.toLowerCase().includes(search))
    );
  });

  // Sort inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    // Handle numeric fields
    if (['quantity_on_hand', 'cost', 'retail'].includes(sortField)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  // --- Edit mode handlers ---

  const handleEditToggle = () => {
    setEditNotice(null);
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (isStaffAuthenticated()) {
      setEditMode(true);
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    // Only enter edit mode if a usable staff token now exists. Guards against
    // calling apiCall (which would force a reload) without a session.
    if (isStaffAuthenticated()) {
      setEditMode(true);
      setEditNotice(null);
    } else {
      setEditNotice('Signed in, but no staff session was created. Try logging in from the Retrieve Quote page, then come back.');
    }
  };

  const handleDraftChange = (id, value) => {
    setDrafts(prev => ({ ...prev, [id]: value }));
    // Clear any prior saved/error badge once the user types again.
    setRowStatus(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveLocation = async (item) => {
    const id = item.store_item_id;
    const draft = drafts[id];
    const newText = (draft !== undefined ? draft : (item.location_text || '')).trim();

    // No-op if unchanged.
    if (newText === (item.location_text || '')) {
      setDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setRowStatus(prev => ({ ...prev, [id]: 'saving' }));

    try {
      const res = await apiCall(`${API_BASE}/update-item-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_item_id: id,
          store_id: parseInt(selectedStore),
          location_text: newText,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInventory(prev => prev.map(it =>
          it.store_item_id === id
            ? {
                ...it,
                location_text: data.location.location_text,
                location_updated_by: data.location.location_updated_by,
                location_updated_at: data.location.location_updated_at,
              }
            : it
        ));
        setDrafts(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setRowStatus(prev => ({ ...prev, [id]: 'saved' }));
      } else {
        setRowStatus(prev => ({ ...prev, [id]: 'error' }));
      }
    } catch (e) {
      // apiCall throws if the session is gone (it triggers re-PIN). Any other
      // failure lands here too — show a per-row error rather than crashing.
      setRowStatus(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = showCost
      ? ['Tire Size', 'Part Number', 'Brand', 'Description', 'QOH', 'Location', 'Cost', 'Retail']
      : ['Tire Size', 'Part Number', 'Brand', 'Description', 'QOH', 'Location', 'Retail'];

    const rows = sortedInventory.map(item => {
      const row = [
        item.tire_size || '',
        item.item_code || '',
        item.brand || '',
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.quantity_on_hand,
        `"${(item.location_text || '').replace(/"/g, '""')}"`,
      ];
      if (showCost) row.push(item.cost.toFixed(2));
      row.push(item.retail.toFixed(2));
      return row.join(',');
    });

    const storeName = STORES.find(s => s.id === parseInt(selectedStore))?.name || selectedStore;
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${selectedStore}_${storeName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print a landscape count sheet. Builds a self-contained print document so it
  // doesn't fight the live page's layout. The <thead> repeats on every printed
  // page automatically (table-header-group). Cost is never included.
  const printCountSheet = () => {
    const storeName = STORES.find(s => s.id === parseInt(selectedStore))?.name || selectedStore;
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const rowsHtml = sortedInventory.map(item => {
      const physical = parsePhysicalCount(item.location_text);
      const systemQoh = Math.round(item.quantity_on_hand);
      const mismatch = physical !== null && physical !== systemQoh;
      const depleted = item.recently_depleted;
      const rowClass = [mismatch ? 'mismatch' : '', depleted ? 'depleted' : ''].filter(Boolean).join(' ');
      // Absolute date on paper: "0 — OUT (since Jun 18)" stays correct after printing.
      const qohCell = depleted
        ? `0 — OUT (since ${escapeHtml(formatShortDate(item.depleted_at))})`
        : escapeHtml(systemQoh);
      return (
        `<tr class="${rowClass}">` +
        `<td>${escapeHtml(item.tire_size || '-')}</td>` +
        `<td>${escapeHtml(item.item_code || '-')}</td>` +
        `<td>${escapeHtml(item.brand || '-')}</td>` +
        `<td class="desc">${escapeHtml(item.description || '')}</td>` +
        `<td class="num">${qohCell}</td>` +
        `<td>${escapeHtml(item.location_text || '')}</td>` +
        `<td class="count"></td>` +
        `<td class="num">$${item.retail.toFixed(2)}</td>` +
        `</tr>`
      );
    }).join('');

    const html =
      '<!doctype html><html><head><meta charset="utf-8">' +
      `<title>Count Sheet — ${escapeHtml(storeName)}</title>` +
      '<style>' +
      '@page { size: landscape; margin: 0.5in; }' +
      '* { box-sizing: border-box; }' +
      "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; margin: 0; }" +
      '.sheet-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }' +
      '.sheet-header h1 { font-size: 18px; margin: 0; color: #6c3483; }' +
      '.sheet-header .meta { font-size: 12px; color: #555; text-align: right; line-height: 1.5; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      'thead { display: table-header-group; }' +
      'tr { page-break-inside: avoid; }' +
      'th { background: #9b59b6; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; border: 1px solid #7d3c98; }' +
      'td { font-size: 11px; padding: 5px 8px; border: 1px solid #ccc; vertical-align: top; }' +
      'th.num, td.num { text-align: right; }' +
      'td.desc { max-width: 320px; }' +
      'td.count { width: 70px; }' +
      'tr.mismatch td { background: #fdecea; }' +
      'tr.depleted td { background: #fff0f0; }' +
      '.footer { margin-top: 18px; font-size: 12px; color: #333; }' +
      '</style></head><body>' +
      '<div class="sheet-header">' +
      '<h1>Physical Tire Count Sheet</h1>' +
      `<div class="meta">${escapeHtml(storeName)} (#${escapeHtml(selectedStore)})<br/>${escapeHtml(dateStr)} &middot; ${sortedInventory.length} SKUs</div>` +
      '</div>' +
      '<table><thead><tr>' +
      '<th>Tire Size</th><th>Part #</th><th>Brand</th><th>Description</th>' +
      '<th class="num">Sys QOH</th><th>Location</th><th>Count</th><th class="num">Retail</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer">Counted by: ______________________&nbsp;&nbsp;&nbsp;Date: ____________</div>' +
      '</body></html>';

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) {
      setEditNotice('Pop-up blocked — allow pop-ups for this site, then click Print Count Sheet again.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Small delay lets the new document lay out before the print dialog opens.
    setTimeout(() => { w.print(); }, 300);
  };

  // ---------------------------------------------------------------------------
  // Usage by Size (group-wide units sold) — staff-gated report
  // ---------------------------------------------------------------------------
  const fetchUsage = async () => {
    if (!usageFrom || !usageTo) return;
    if (usageFrom > usageTo) {
      setUsageError('Start date must be on or before end date.');
      return;
    }
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await apiCall(`${API_BASE}/sales-by-size`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from: usageFrom, date_to: usageTo }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsageRows(data.rows || []);
        setUsageExceptions(data.exceptions || []);
        setUsageLoaded(true);
      } else {
        setUsageError(data.error || 'Failed to load usage.');
      }
    } catch (e) {
      // apiCall triggers re-PIN on a dead session; other failures land here.
      setUsageError('Could not load usage — your staff session may have expired. Try again.');
    }
    setUsageLoading(false);
  };

  // Auto-load the first time the Usage view is opened.
  useEffect(() => {
    if (selectedStore === 'GROUP' && !usageLoaded && !usageLoading) {
      fetchUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  // Drill from a usage cell into that store's on-hand, filtered to the size.
  const drillToOnHand = (storeId, size) => {
    if (!size || size === 'Other / Unparsed') return;
    setSearchFilter(size);
    setSelectedStore(String(storeId));
  };

  // Column + group totals for the usage footer row.
  const usageColTotals = USAGE_STORES.reduce((acc, s) => {
    acc[s.key] = usageRows.reduce((n, r) => n + (parseFloat(r[s.key]) || 0), 0);
    return acc;
  }, {});
  const usageGroupTotal = usageRows.reduce((n, r) => n + (parseFloat(r.group_total) || 0), 0);

  const exportUsageCSV = () => {
    const headers = ['Tire Size', ...USAGE_STORES.map(s => s.name), 'Group Total'];
    const lines = usageRows.map(r => {
      const cells = [r.tire_size, ...USAGE_STORES.map(s => r[s.key] ?? ''), r.group_total ?? ''];
      return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    const totalRow = ['GROUP TOTAL', ...USAGE_STORES.map(s => usageColTotals[s.key]), usageGroupTotal]
      .map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    const csv = [headers.join(','), ...lines, totalRow].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage_by_size_${usageFrom}_to_${usageTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const usageTh = {
    padding: '8px 6px', textAlign: 'center', color: 'white', background: '#9b59b6',
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px',
    whiteSpace: 'nowrap', border: '1px solid #efe3f5',
  };
  const usageTd = {
    padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #eee', whiteSpace: 'nowrap',
  };

  const selectedStoreName = STORES.find(s => s.id === parseInt(selectedStore))?.name || '';
  const staffEmployee = editMode ? getStaffEmployee() : null;

  const thStyle = {
    padding: '12px 10px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#333',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="inventory"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        showStorePlaceholder={true}
        showGroupOption={true}
      />

      {/* Hero Banner - matches TireFinder */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
        padding: '60px 20px',
        position: 'relative',
      }}>
      </div>

      {/* Main Content - overlapping the hero like TireFinder */}
      <div style={{ maxWidth: '1200px', margin: '-40px auto 40px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
          padding: '40px',
        }}>
          {/* Title */}
          <h1 style={{
            color: '#9b59b6',
            fontSize: '28px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            letterSpacing: '2px',
          }}>
            STORE TIRE INVENTORY
          </h1>
          <p style={{
            color: '#666',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '35px',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            {isGroup ? 'UNITS SOLD BY SIZE — ALL STORES' : 'VIEW IN-STOCK TIRES BY LOCATION'}
          </p>

          {/* ===================== USAGE BY SIZE VIEW (group scope) ===================== */}
          {isGroup && (
            <div>
              {/* Date range + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
                    From<br/>
                    <input type="date" value={usageFrom} max={usageTo}
                      onChange={(e) => setUsageFrom(e.target.value)}
                      style={{ padding: '8px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }} />
                  </label>
                  <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
                    To<br/>
                    <input type="date" value={usageTo} min={usageFrom}
                      onChange={(e) => setUsageTo(e.target.value)}
                      style={{ padding: '8px 10px', border: '2px solid #9b59b6', borderRadius: '8px', fontSize: '13px', marginTop: '4px' }} />
                  </label>
                  <button onClick={fetchUsage} disabled={usageLoading}
                    style={{ padding: '10px 22px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '25px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', cursor: usageLoading ? 'default' : 'pointer', opacity: usageLoading ? 0.6 : 1 }}>
                    {usageLoading ? 'LOADING…' : 'APPLY'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {usageExceptions.length > 0 && (
                    <button onClick={() => setShowExceptions(true)}
                      style={{ padding: '10px 18px', backgroundColor: '#fff4e5', color: '#b9770e', border: '1px solid #f0c37b', borderRadius: '25px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      ⚠ {usageExceptions.length} NEED ATTENTION
                    </button>
                  )}
                  <button onClick={exportUsageCSV} disabled={usageRows.length === 0}
                    style={{ padding: '10px 20px', backgroundColor: usageRows.length ? '#27ae60' : '#e0e0e0', color: usageRows.length ? 'white' : '#999', border: 'none', borderRadius: '25px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', cursor: usageRows.length ? 'pointer' : 'default' }}>
                    ⬇ EXPORT CSV
                  </button>
                </div>
              </div>

              {usageLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>Loading usage…</div>
              )}
              {usageError && !usageLoading && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#e74c3c' }}>{usageError}</div>
              )}
              {!usageLoading && !usageError && usageLoaded && usageRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No tire usage in this date range.</div>
              )}

              {!usageLoading && !usageError && usageRows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    Units sold {usageFrom} → {usageTo}. Combines inventoried + wildcard tires. Click a store cell to jump to that store's on-hand for the size.
                  </div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '10px' }}>
                    {USAGE_STORES.map(s => `${s.id} ${s.name}`).join('  ·  ')}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ ...usageTh, textAlign: 'left', position: 'sticky', left: 0 }}>Size</th>
                        {USAGE_STORES.map(s => (
                          <th key={s.key} style={usageTh} title={s.name}>{s.id}</th>
                        ))}
                        <th style={{ ...usageTh, background: '#7d3c98' }}>Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageRows.map((r, i) => (
                        <tr key={r.tire_size} style={{ background: r.is_other ? '#faf6fb' : (i % 2 ? '#faf7fc' : 'white') }}>
                          <td style={{ ...usageTd, textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, background: 'inherit', color: r.is_other ? '#999' : '#333' }}>
                            {r.tire_size}
                          </td>
                          {USAGE_STORES.map(s => {
                            const v = parseFloat(r[s.key]) || 0;
                            const clickable = v > 0 && !r.is_other;
                            return (
                              <td key={s.key}
                                onClick={() => clickable && drillToOnHand(s.id, r.tire_size)}
                                title={clickable ? `View ${s.name} on-hand for ${r.tire_size}` : undefined}
                                style={{ ...usageTd, cursor: clickable ? 'pointer' : 'default', color: v > 0 ? '#333' : '#ccc' }}>
                                {v > 0 ? v : '·'}
                              </td>
                            );
                          })}
                          <td style={{ ...usageTd, fontWeight: 700, color: '#7d3c98' }}>{parseFloat(r.group_total) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ ...usageTd, textAlign: 'left', fontWeight: 700, position: 'sticky', left: 0, background: '#f0e6f5' }}>GROUP TOTAL</td>
                        {USAGE_STORES.map(s => (
                          <td key={s.key} style={{ ...usageTd, fontWeight: 700, background: '#f0e6f5' }}>{usageColTotals[s.key] || 0}</td>
                        ))}
                        <td style={{ ...usageTd, fontWeight: 800, background: '#e5d4ef', color: '#5b2c6f' }}>{usageGroupTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {!isGroup && loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
              <p style={{ fontSize: '16px' }}>🔍 Loading inventory...</p>
            </div>
          )}

          {/* Error State */}
          {!isGroup && error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
              <p style={{ fontSize: '16px' }}>{error}</p>
            </div>
          )}

          {/* Initial State - No Store Selected */}
          {!isGroup && !selectedStore && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛞</div>
              <p style={{ fontSize: '16px' }}>Select a store from the header to view tire inventory</p>
            </div>
          )}

          {/* Results */}
          {!isGroup && !loading && !error && selectedStore && summary && (
            <>
              {/* Summary Cards */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                marginBottom: '25px',
                flexWrap: 'wrap'
              }}>
                <SummaryCard
                  label="Store"
                  value={selectedStore}
                  subtext={selectedStoreName}
                />
                <SummaryCard
                  label="SKUs"
                  value={summary.total_skus}
                  subtext="unique items"
                />
                <SummaryCard
                  label="Units"
                  value={summary.total_units}
                  subtext="in stock"
                />
                <SummaryCard
                  label="Brands"
                  value={summary.unique_brands}
                  subtext="available"
                />
                <SummaryCard
                  label="Out of Stock"
                  value={summary.out_of_stock_skus ?? 0}
                  subtext="0 qty · last 7 days"
                  accent={(summary.out_of_stock_skus ?? 0) > 0 ? 'red' : undefined}
                />
              </div>

              {/* Controls Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="🔍 Filter by size, brand, description, location..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    padding: '10px 15px',
                    border: '2px solid #9b59b6',
                    borderRadius: '25px',
                    fontSize: '13px',
                    width: '320px',
                    maxWidth: '100%',
                    outline: 'none',
                  }}
                />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Edit Locations Toggle */}
                  <button
                    onClick={handleEditToggle}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: editMode ? '#27ae60' : '#e0e0e0',
                      color: editMode ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    {editMode ? '✓ DONE EDITING' : '📝 EDIT LOCATIONS'}
                  </button>

                  {/* Print Count Sheet */}
                  <button
                    onClick={printCountSheet}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#34495e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    🖨 PRINT COUNT SHEET
                  </button>

                  {/* Hide/Show Cost Toggle */}
                  <button
                    onClick={() => setShowCost(!showCost)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: showCost ? '#9b59b6' : '#e0e0e0',
                      color: showCost ? 'white' : '#666',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    {showCost ? '👁 HIDE COST' : '👁 SHOW COST'}
                  </button>

                  {/* Export Button */}
                  <button
                    onClick={exportCSV}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                    }}
                  >
                    📥 EXPORT CSV
                  </button>
                </div>
              </div>

              {/* Edit-mode banner */}
              {editMode && (
                <div style={{
                  backgroundColor: '#eafaf1',
                  border: '1px solid #27ae60',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  color: '#1e7e45',
                }}>
                  ✏️ Edit mode on{staffEmployee ? ` — editing as ${staffEmployee.display_name || staffEmployee.user_name}` : ''}. Click a Location cell, type the count + rack (e.g. <strong>4-R2</strong> or <strong>2-R2, 2-UBR1</strong>), then press Enter or click away to save.
                </div>
              )}

              {/* Edit notice (errors / info) */}
              {editNotice && (
                <div style={{
                  backgroundColor: '#fdecea',
                  border: '1px solid #e74c3c',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  color: '#c0392b',
                }}>
                  {editNotice}
                </div>
              )}

              {/* Results Count */}
              {searchFilter && (
                <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
                  Showing {sortedInventory.length} of {inventory.length} items
                </p>
              )}

              {/* Inventory Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '2px solid #9b59b6' }}>
                      <th onClick={() => handleSort('tire_size')} style={thStyle}>
                        Tire Size{getSortIndicator('tire_size')}
                      </th>
                      <th onClick={() => handleSort('item_code')} style={thStyle}>
                        Part #{getSortIndicator('item_code')}
                      </th>
                      <th onClick={() => handleSort('brand')} style={thStyle}>
                        Brand{getSortIndicator('brand')}
                      </th>
                      <th onClick={() => handleSort('description')} style={thStyle}>
                        Description{getSortIndicator('description')}
                      </th>
                      <th onClick={() => handleSort('quantity_on_hand')} style={{ ...thStyle, textAlign: 'center' }}>
                        QOH{getSortIndicator('quantity_on_hand')}
                      </th>
                      <th onClick={() => handleSort('location_text')} style={thStyle}>
                        Location{getSortIndicator('location_text')}
                      </th>
                      {showCost && (
                        <th onClick={() => handleSort('cost')} style={{ ...thStyle, textAlign: 'right' }}>
                          Cost{getSortIndicator('cost')}
                        </th>
                      )}
                      <th onClick={() => handleSort('retail')} style={{ ...thStyle, textAlign: 'right' }}>
                        Retail{getSortIndicator('retail')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInventory.map((item, idx) => {
                      const id = item.store_item_id;
                      const physical = parsePhysicalCount(item.location_text);
                      const systemQoh = Math.round(item.quantity_on_hand);
                      const mismatch = physical !== null && physical !== systemQoh;
                      const status = rowStatus[id];
                      const draftVal = drafts[id] !== undefined ? drafts[id] : (item.location_text || '');
                      const depleted = item.recently_depleted;

                      return (
                        <tr
                          key={id || idx}
                          style={{
                            borderBottom: '1px solid #eee',
                            backgroundColor: depleted ? '#fff0f0' : (item.quantity_on_hand <= 2 ? '#fff3cd' : 'white'),
                          }}
                        >
                          <td style={{ padding: '12px 10px', fontWeight: '600', color: '#9b59b6' }}>
                            {item.tire_size || '-'}
                          </td>
                          <td style={{ padding: '12px 10px', fontSize: '12px', color: '#666' }}>
                            {item.item_code || '-'}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            {item.brand || '-'}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'left', maxWidth: '300px' }}>
                            <span style={{ fontSize: '13px' }}>{item.description}</span>
                          </td>
                          <td style={{
                            padding: '12px 10px',
                            textAlign: 'center',
                            fontWeight: '700',
                            color: depleted ? '#c0392b' : (item.quantity_on_hand <= 2 ? '#e67e22' : '#27ae60')
                          }}>
                            {depleted ? (
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: '#c0392b',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  letterSpacing: '0.5px',
                                }}>OUT</span>
                                <div style={{ fontSize: '10px', color: '#c0392b', fontWeight: '600', marginTop: '3px', whiteSpace: 'nowrap' }}>
                                  {item.days_since_depleted === 0 ? 'depleted today' : `depleted ${item.days_since_depleted}d ago`}
                                </div>
                              </div>
                            ) : (
                              item.quantity_on_hand
                            )}
                          </td>

                          {/* Location cell */}
                          <td style={{
                            padding: '12px 10px',
                            backgroundColor: mismatch ? '#fdecea' : 'transparent',
                            minWidth: '160px',
                          }}>
                            {editMode ? (
                              <div>
                                <input
                                  type="text"
                                  value={draftVal}
                                  placeholder="e.g. 4-R2"
                                  onChange={(e) => handleDraftChange(id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.target.blur();
                                    }
                                  }}
                                  onBlur={() => saveLocation(item)}
                                  style={{
                                    width: '120px',
                                    padding: '6px 8px',
                                    border: '1px solid #9b59b6',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    outline: 'none',
                                  }}
                                />
                                <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                                  {status === 'saving' && <span style={{ color: '#888' }}>saving…</span>}
                                  {status === 'saved' && <span style={{ color: '#27ae60' }}>saved ✓</span>}
                                  {status === 'error' && <span style={{ color: '#e74c3c' }}>⚠ failed</span>}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: item.location_text ? '#333' : '#bbb' }}>
                                  {item.location_text || '—'}
                                </span>
                                {mismatch && (
                                  <span style={{ display: 'block', fontSize: '11px', color: '#c0392b', marginTop: '2px' }}>
                                    ⚠ counted {physical}, sys {systemQoh}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {showCost && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#666' }}>
                              ${item.cost.toFixed(2)}
                            </td>
                          )}
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '600' }}>
                            ${item.retail.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {sortedInventory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p>No tires match your search criteria</p>
                </div>
              )}

              {/* Legend */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '25px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Low stock (2 or fewer units)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#fdecea',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Physical count doesn't match system QOH</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#fff0f0',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Out of stock — depleted within 7 days</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Staff Login Modal (for editing locations) */}
      {showLogin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowLogin(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '15px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLogin(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '22px',
                color: '#999',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 style={{ color: '#9b59b6', fontSize: '20px', fontWeight: '700', textAlign: 'center', marginBottom: '5px' }}>
              Staff Login
            </h2>
            <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
              Log in to edit physical inventory locations.
            </p>
            <StaffLoginForm onSuccess={handleLoginSuccess} compact={true} />
          </div>
        </div>
      )}

      {/* Usage exceptions modal — lines that need source correction in Turbo */}
      {showExceptions && (
        <div onClick={() => setShowExceptions(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '10px', padding: '25px', maxWidth: '860px', width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowExceptions(false)}
              style={{ position: 'absolute', top: '12px', right: '15px', background: 'none', border: 'none', fontSize: '22px', color: '#999', cursor: 'pointer', lineHeight: 1 }} aria-label="Close">×</button>
            <h2 style={{ color: '#b9770e', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Lines needing attention</h2>
            <p style={{ color: '#666', fontSize: '12px', marginBottom: '16px' }}>
              These wildcard lines couldn't be read cleanly, or the tire line and size line disagree. Counts still reflect the tire line's own size — fix these at the source in Turbo so future reports are exact.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  {['Issue', 'Store', 'Invoice', 'Date', 'Qty', 'Tire line', 'Size line'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #f0c37b', color: '#8a5a0b', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageExceptions.map((x, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: x.issue === 'CONFLICT' ? '#fdecea' : '#eef3fb', color: x.issue === 'CONFLICT' ? '#c0392b' : '#2c5aa0' }}>{x.issue}</span>
                    </td>
                    <td style={{ padding: '6px 8px' }}>{x.store_number}</td>
                    <td style={{ padding: '6px 8px' }}>{x.invoice_number}</td>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{x.invoice_date}</td>
                    <td style={{ padding: '6px 8px' }}>{parseFloat(x.qty) || 0}</td>
                    <td style={{ padding: '6px 8px' }}>{x.tire_line || '—'}{x.own_size ? ` (${x.own_size})` : ''}</td>
                    <td style={{ padding: '6px 8px' }}>{x.size_line || '—'}{x.sibling_size ? ` (${x.sibling_size})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>
            <a href="#/about" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>About Us</a>
            <a href="#/contact" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Contact</a>
            <a href="#/privacy-policy" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>SMS Terms</a>
            <a href="#/do-not-sell" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px' }}>Do Not Sell My Info</a>
          </div>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            © 2026 P.C.J.L., Inc. Tire data provided by MOTOR & USAutoForce.
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
            tires.myjiffylube.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
