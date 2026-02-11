// =============================================================================
// QUOTE VIEW - Customer-Facing Quote Display v5
// =============================================================================
// Route: #/quote/:code
// Updated: 2026-02-11
// v5 Changes:
//   - Complete visual redesign for print readability
//   - White header with maroon top accent (less toner)
//   - Clean tire card with maroon left border (replaces maroon box)
//   - Compact 2x2 tread grid (removes car image)
//   - Side-by-side tread + pricing layout
//   - All text dark (#1e293b) and bold for print clarity
//   - Portrait print layout (replaces landscape)
//   - Fixed car length calculation (÷15 instead of ÷8)
//   - Promo/savings badge prominent next to warranty
//   - Full brand names in comparison card
//   - Darker borders (#cbd5e1) for print visibility
// =============================================================================

import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';
const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

// Tread status thresholds: 0-4 red, 5-6 yellow, 7+ green
const getTreadInfo = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth <= 4) return { status: 'replace', color: '#dc2626', bgColor: '#fef2f2', label: 'REPLACE NOW', cssClass: 'replace' };
  if (depth <= 6) return { status: 'consider', color: '#d97706', bgColor: '#fffbeb', label: 'CONSIDER REPLACEMENT', cssClass: 'consider' };
  return { status: 'good', color: '#16a34a', bgColor: '#f0fdf4', label: 'GOOD', cssClass: 'good' };
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  });
};

// ─── Tread Tile Component ───
const TreadTile = ({ label, data }) => {
  if (!data) return null;
  const info = getTreadInfo(data.lowest);
  if (!info) return null;

  const borderColors = { good: '#16a34a', consider: '#d97706', replace: '#dc2626' };
  const bgColors = { good: '#f0fdf4', consider: '#fffbeb', replace: '#fef2f2' };

  return (
    <div style={{
      borderRadius: '8px',
      padding: '10px 12px',
      textAlign: 'center',
      border: `2px solid ${borderColors[info.cssClass]}`,
      backgroundColor: bgColors[info.cssClass]
    }}>
      <div style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', marginBottom: '3px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1.1, color: info.color }}>
        {data.lowest}<span style={{ fontSize: '11px', fontWeight: '600' }}>/32</span>
      </div>
      <div style={{ fontSize: '8px', fontWeight: '700', letterSpacing: '0.5px', marginTop: '2px', color: info.color }}>{info.label}</div>
    </div>
  );
};

// ─── Stopping Distance Chart ───
const StoppingDistanceChart = ({ currentDistance, newDistance }) => {
  if (!currentDistance) return null;
  
  const maxDistance = 400;
  const currentPercent = (currentDistance / maxDistance) * 100;
  const newPercent = (newDistance / maxDistance) * 100;
  const difference = currentDistance - newDistance;

  return (
    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '9px', fontWeight: '700', color: '#1e293b', letterSpacing: '1px', textAlign: 'center', marginBottom: '8px' }}>
        STOPPING DISTANCE (60 MPH, WET ROAD)
      </div>
      
      {/* Current */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700', width: '70px', flexShrink: 0 }}>Current</div>
        <div style={{ flex: 1, height: '14px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#fee2e2' }}>
          <div style={{ width: `${currentPercent}%`, height: '100%', borderRadius: '4px', backgroundColor: '#dc2626' }} />
        </div>
        <div style={{ fontSize: '12px', fontWeight: '700', width: '42px', flexShrink: 0, textAlign: 'right', color: '#dc2626' }}>{currentDistance} ft</div>
      </div>

      {/* New */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700', width: '70px', flexShrink: 0 }}>New Tires</div>
        <div style={{ flex: 1, height: '14px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#dcfce7' }}>
          <div style={{ width: `${newPercent}%`, height: '100%', borderRadius: '4px', backgroundColor: '#16a34a' }} />
        </div>
        <div style={{ fontSize: '12px', fontWeight: '700', width: '42px', flexShrink: 0, textAlign: 'right', color: '#16a34a' }}>{newDistance} ft</div>
      </div>

      {/* Callout */}
      {difference > 0 && (
        <div style={{
          backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px',
          padding: '7px 10px', textAlign: 'center', fontSize: '11.5px', color: '#1e293b', fontWeight: '500', marginTop: '8px'
        }}>
          New tires could reduce your stopping distance by <strong>{difference} feet</strong> — about <strong>{(difference / 15).toFixed(1)} car lengths</strong>!
        </div>
      )}
    </div>
  );
};

// ─── Compact Tread Diagram (2x2 grid, no car image) ───
const TreadDiagram = ({ treadData }) => {
  if (!treadData) return null;

  const tires = treadData.tires || {};
  const lf = tires.front_left || treadData.lf;
  const rf = tires.front_right || treadData.rf;
  const lr = tires.rear_left || treadData.lr;
  const rr = tires.rear_right || treadData.rr;

  return (
    <div>
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#1e293b', fontWeight: '600', letterSpacing: '1px', marginBottom: '6px' }}>
        ← FRONT OF VEHICLE
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <TreadTile label="PASS FRONT" data={rf} />
        <TreadTile label="PASS REAR" data={rr} />
        <TreadTile label="DRIVER FRONT" data={lf} />
        <TreadTile label="DRIVER REAR" data={lr} />
      </div>

      {/* Summary */}
      {treadData.summary && (
        <div style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center', marginBottom: '10px' }}>
          {treadData.summary.replace_count > 0 && (
            <span style={{ color: '#dc2626', marginRight: '12px' }}>
              🔴 {treadData.summary.replace_count} tire{treadData.summary.replace_count > 1 ? 's' : ''} need replacement
            </span>
          )}
          {treadData.summary.consider_count > 0 && (
            <span style={{ color: '#d97706', marginRight: '12px' }}>
              🟡 {treadData.summary.consider_count} tire{treadData.summary.consider_count > 1 ? 's' : ''} to monitor
            </span>
          )}
          {treadData.summary.ok_count > 0 && (
            <span style={{ color: '#16a34a' }}>
              🟢 {treadData.summary.ok_count} tire{treadData.summary.ok_count > 1 ? 's' : ''} good
            </span>
          )}
        </div>
      )}

      {/* Stopping Distance */}
      {(treadData.summary?.stopping_distance_current || treadData.stopping_distance_current) && (
        <StoppingDistanceChart 
          currentDistance={treadData.summary?.stopping_distance_current || treadData.stopping_distance_current} 
          newDistance={treadData.summary?.stopping_distance_new || treadData.stopping_distance_new || 195} 
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main QuoteView Component
// ═══════════════════════════════════════════════════════════════════
const QuoteView = () => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // SMS consent modal
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);

  // Edit mode (same-day only)
  const [editMode, setEditMode] = useState(false);
  const [editQuantity, setEditQuantity] = useState(4);
  const [editPromo, setEditPromo] = useState('');
  const [editCustomer, setEditCustomer] = useState({});
  const [saving, setSaving] = useState(false);
  const [editTreadDepths, setEditTreadDepths] = useState({
    lf: { inside: '', middle: '', outside: '' },
    rf: { inside: '', middle: '', outside: '' },
    lr: { inside: '', middle: '', outside: '' },
    rr: { inside: '', middle: '', outside: '' },
  });

  const getShortCode = () => {
    const hash = window.location.hash;
    const match = hash.match(/\/quote\/([A-Z0-9]+)/i);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const fetchQuote = async () => {
      const code = getShortCode();
      if (!code) {
        setError('No quote code provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/get-quote?code=${code}&key=${API_KEY}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Quote not found');
        } else {
          setQuote(data.quote);

          // Auto-open edit mode if ?edit=true is in the URL and quote is editable
          if (window.location.hash.includes('edit=true') && data.quote.is_editable) {
            const q = data.quote;
            setEditQuantity(q.pricing.quantity);
            setEditPromo(q.pricing.promo_id || '');
            setEditCustomer({
              first_name: q.customer.first_name || '',
              last_name: q.customer.last_name || '',
              phone: q.customer.phone || '',
              email: q.customer.email || '',
            });
            if (q.tread_depth?.tires) {
              const t = q.tread_depth.tires;
              setEditTreadDepths({
                lf: { inside: t.front_left?.inside?.toString() || '', middle: t.front_left?.middle?.toString() || '', outside: t.front_left?.outside?.toString() || '' },
                rf: { inside: t.front_right?.inside?.toString() || '', middle: t.front_right?.middle?.toString() || '', outside: t.front_right?.outside?.toString() || '' },
                lr: { inside: t.rear_left?.inside?.toString() || '', middle: t.rear_left?.middle?.toString() || '', outside: t.rear_left?.outside?.toString() || '' },
                rr: { inside: t.rear_right?.inside?.toString() || '', middle: t.rear_right?.middle?.toString() || '', outside: t.rear_right?.outside?.toString() || '' },
              });
            }
            setEditMode(true);
          }
        }
      } catch (err) {
        setError('Failed to load quote');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, []);

  // ─── Action Handlers ───

  const handleEmailQuote = async () => {
    if (!quote?.customer?.email) {
      const email = prompt('Enter email address:');
      if (!email) return;
      sendEmail(email);
    } else {
      sendEmail(quote.customer.email);
    }
  };

  const sendEmail = async (email) => {
    setSendingEmail(true);
    setActionMessage(null);
    try {
      const response = await fetch(`${API_BASE}/email-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: API_KEY, quote_id: quote.quote_id, email_override: email })
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Quote emailed to ${email}` });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to send email' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const openSmsModal = () => {
    setSmsPhone(quote?.customer?.phone ? formatPhone(quote.customer.phone) : '');
    setSmsConsent(false);
    setShowSmsModal(true);
  };

  const handleTextQuote = async () => {
    if (!smsConsent) return;
    const phone = smsPhone.replace(/\D/g, '');
    if (phone.length < 10) {
      setActionMessage({ type: 'error', text: 'Please enter a valid phone number' });
      setShowSmsModal(false);
      return;
    }

    setShowSmsModal(false);
    setSendingSms(true);
    setActionMessage(null);
    try {
      const response = await fetch(`${API_BASE}/sms-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          quote_id: quote.quote_id,
          phone_override: phone !== quote?.customer?.phone?.replace(/\D/g, '') ? phone : null
        })
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Quote texted to ${formatPhone(phone)}` });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to send text' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to send text' });
    } finally {
      setSendingSms(false);
    }
  };

  const handlePayOnline = async () => {
    let customerEmail = quote?.customer?.email;
    
    if (!customerEmail) {
      customerEmail = prompt('Enter your email address to receive the PayPal invoice:');
      if (!customerEmail) return;
      if (!customerEmail.includes('@') || !customerEmail.includes('.')) {
        setActionMessage({ type: 'error', text: 'Please enter a valid email address' });
        return;
      }
    }

    setSendingInvoice(true);
    setActionMessage(null);

    try {
      const response = await fetch(`${API_BASE}/create-paypal-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: API_KEY, quote_id: quote.quote_id })
      });

      const data = await response.json();

      if (data.success) {
        setActionMessage({ type: 'success', text: `PayPal invoice sent to ${customerEmail}! Check your email to pay securely.` });
      } else {
        if (data.error?.includes('email is required')) {
          setActionMessage({ type: 'error', text: 'Email address is required to send invoice. Please contact the store.' });
        } else {
          setActionMessage({ type: 'error', text: data.error || 'Failed to create invoice' });
        }
      }
    } catch (err) {
      console.error('PayPal invoice error:', err);
      setActionMessage({ type: 'error', text: 'Failed to create PayPal invoice. Please try again.' });
    } finally {
      setSendingInvoice(false);
    }
  };

  // ─── Edit Mode Handlers ───

  const enterEditMode = () => {
    setEditQuantity(quote.pricing.quantity);
    setEditPromo(quote.pricing.promo_id || '');
    setEditCustomer({
      first_name: quote.customer?.first_name || '',
      last_name: quote.customer?.last_name || '',
      phone: quote.customer?.phone || '',
      email: quote.customer?.email || '',
      license_plate: quote.customer?.license_plate || '',
      license_state: quote.customer?.license_state || 'CA',
    });
    if (quote.tread_depth?.tires) {
      const t = quote.tread_depth.tires;
      setEditTreadDepths({
        lf: { inside: t.front_left?.inside?.toString() || '', middle: t.front_left?.middle?.toString() || '', outside: t.front_left?.outside?.toString() || '' },
        rf: { inside: t.front_right?.inside?.toString() || '', middle: t.front_right?.middle?.toString() || '', outside: t.front_right?.outside?.toString() || '' },
        lr: { inside: t.rear_left?.inside?.toString() || '', middle: t.rear_left?.middle?.toString() || '', outside: t.rear_left?.outside?.toString() || '' },
        rr: { inside: t.rear_right?.inside?.toString() || '', middle: t.rear_right?.middle?.toString() || '', outside: t.rear_right?.outside?.toString() || '' },
      });
    }
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setActionMessage(null);
    try {
      const phoneDigits = editCustomer.phone.replace(/\D/g, '');
      const allTreadValues = Object.values(editTreadDepths)
        .flatMap(t => Object.values(t))
        .filter(v => v !== '' && !isNaN(parseInt(v)));
      
      const treadData = allTreadValues.length > 0 ? {
        lf: { inside: editTreadDepths.lf.inside ? parseInt(editTreadDepths.lf.inside) : null, middle: editTreadDepths.lf.middle ? parseInt(editTreadDepths.lf.middle) : null, outside: editTreadDepths.lf.outside ? parseInt(editTreadDepths.lf.outside) : null },
        rf: { inside: editTreadDepths.rf.inside ? parseInt(editTreadDepths.rf.inside) : null, middle: editTreadDepths.rf.middle ? parseInt(editTreadDepths.rf.middle) : null, outside: editTreadDepths.rf.outside ? parseInt(editTreadDepths.rf.outside) : null },
        lr: { inside: editTreadDepths.lr.inside ? parseInt(editTreadDepths.lr.inside) : null, middle: editTreadDepths.lr.middle ? parseInt(editTreadDepths.lr.middle) : null, outside: editTreadDepths.lr.outside ? parseInt(editTreadDepths.lr.outside) : null },
        rr: { inside: editTreadDepths.rr.inside ? parseInt(editTreadDepths.rr.inside) : null, middle: editTreadDepths.rr.middle ? parseInt(editTreadDepths.rr.middle) : null, outside: editTreadDepths.rr.outside ? parseInt(editTreadDepths.rr.outside) : null },
      } : undefined;

      const response = await fetch(`${API_BASE}/update-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          quote_id: quote.quote_id,
          quantity: editQuantity,
          promo_id: editPromo || null,
          customer: {
            first_name: editCustomer.first_name,
            last_name: editCustomer.last_name,
            phone: phoneDigits || null,
            email: editCustomer.email || null,
            license_plate: editCustomer.license_plate || null,
            license_state: editCustomer.license_state || null,
          },
          tread_depths: treadData,
          employee: { user_name: quote.created_by?.username }
        })
      });
      const data = await response.json();
      if (data.success) {
        const msg = data.promo_warning 
          ? `Quote updated! Note: ${data.promo_warning}`
          : 'Quote updated successfully!';
        setActionMessage({ type: 'success', text: msg });
        setEditMode(false);
        const refreshResp = await fetch(`${API_BASE}/get-quote?id=${quote.quote_id}&key=${API_KEY}`);
        const refreshData = await refreshResp.json();
        if (refreshData.success) setQuote(refreshData.quote);
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update quote' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleReQuote = () => {
    const reQuoteData = {
      from_quote_id: quote.quote_id,
      from_quote_number: quote.quote_number,
      customer: {
        first_name: quote.customer.first_name || '',
        last_name: quote.customer.last_name || '',
        full_name: quote.customer.full_name || '',
        phone: quote.customer.phone || '',
        email: quote.customer.email || '',
        license_plate: quote.customer.license_plate || '',
        license_state: quote.customer.license_state || 'CA',
        data_source: quote.customer.data_source || 'manual'
      },
      vehicle: quote.vehicle || null,
      tire_size: quote.tire?.size || null,
      treads: quote.tread_depth || null,
      store_id: quote.store?.id || null,
      quantity: quote.pricing?.quantity || 4
    };
    sessionStorage.setItem('jl_requote_data', JSON.stringify(reQuoteData));
    sessionStorage.setItem('jl_requote_pending', 'true');
    window.location.hash = '#/';
  };

  // ─── Loading / Error States ───

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <div>Loading quote...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', backgroundColor: '#fef2f2', padding: '40px', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>Quote Not Found</h2>
          <p style={{ color: '#1e293b' }}>{error}</p>
        </div>
      </div>
    );
  }

  // ─── Data shortcuts ───
  const p = quote.pricing;
  const store = quote.store;
  const customer = quote.customer;
  const treadData = quote.tread_depth;
  const tire = quote.tire;

  const hasVehicleInfo = quote.vehicle?.display && 
    quote.vehicle.display !== '' && 
    !quote.vehicle.display.toLowerCase().includes('unknown');

  // ─── Shared styles ───
  const sectionLabel = { fontSize: '10px', fontWeight: '700', color: '#1e293b', letterSpacing: '1.5px', marginBottom: '8px' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' };

  return (
    <div className="quote-outer-container" style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px' }}>
      <div className="quote-main-container" style={{ maxWidth: '820px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        
        {/* ═══ HEADER ═══ White with maroon top accent */}
        <div className="quote-header" style={{
          borderTop: '5px solid #8b1538',
          backgroundColor: 'white',
          padding: '18px 28px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          borderBottom: '1px solid #cbd5e1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <a href="#/" style={{ textDecoration: 'none' }}>
              <img src={JL_LOGO} alt="Jiffy Lube Multicare" style={{ height: '38px', cursor: 'pointer' }} />
            </a>
            <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: '#1e293b', fontWeight: '500' }}>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{store?.name} {store?.bar_number && `• BAR ${store.bar_number}`}</div>
              <div>{store?.full_address}</div>
              <div>{store?.phone_formatted || formatPhone(store?.phone)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#8b1538', fontWeight: '700' }}>TIRE QUOTE</div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', margin: '2px 0' }}>{quote.quote_number}</div>
            <div style={{ fontSize: '11.5px', color: '#1e293b', fontWeight: '500' }}>
              Valid until: {formatDate(quote.expires_at)}
            </div>
            {quote.is_expired && (
              <div style={{ backgroundColor: '#fbbf24', color: '#78350f', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', marginTop: '6px', display: 'inline-block' }}>
                EXPIRED
              </div>
            )}
            {/* Print button */}
            <button data-print-hide="true" onClick={() => window.print()} style={{
              backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1',
              padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
              cursor: 'pointer', marginTop: '8px', display: 'block', marginLeft: 'auto'
            }}>
              🖨️ Print Quote
            </button>
          </div>
        </div>

        {/* Revision Chain Banner */}
        {quote.revision && (
          <div data-print-hide="true" style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 28px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', flexWrap: 'wrap' }}>
            {quote.revision.revised_from && (
              <span style={{ color: '#1d4ed8' }}>
                ← Revised from{' '}
                <a href={`#/quote/${quote.revision.revised_from.short_code}`} style={{ color: '#1d4ed8', fontWeight: '600' }}>
                  {quote.revision.revised_from.quote_number}
                </a>
              </span>
            )}
            {quote.revision.revised_to && (
              <span style={{ color: '#7c3aed' }}>
                Newer revision:{' '}
                <a href={`#/quote/${quote.revision.revised_to.short_code}`} style={{ color: '#7c3aed', fontWeight: '600' }}>
                  {quote.revision.revised_to.quote_number} →
                </a>
              </span>
            )}
          </div>
        )}

        {/* Edit Tracking */}
        {quote.edit_history && (
          <div data-print-hide="true" style={{ backgroundColor: '#fefce8', borderBottom: '1px solid #fde68a', padding: '8px 28px', textAlign: 'center', fontSize: '11px', color: '#854d0e', fontWeight: '500' }}>
            Last edited by {quote.edit_history.last_edited_by} on {formatDate(quote.edit_history.last_edited_at)}
          </div>
        )}

        {/* SMS Consent Modal */}
        {showSmsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '30px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#16a34a', fontSize: '18px', fontWeight: '700' }}>Text This Quote</h3>
                <button onClick={() => setShowSmsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>×</button>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>PHONE NUMBER</label>
                <input type="tel" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} placeholder="(805) 555-1234"
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#16a34a' }} />
                  <span style={{ fontSize: '11px', color: '#1e293b', lineHeight: '1.4' }}>
                    I consent to receive this tire quote and related service messages from Jiffy Lube via SMS. 
                    Msg & data rates may apply. Reply STOP to opt out.{' '}
                    <a href="#/sms-consent" target="_blank" style={{ color: '#16a34a' }}>SMS Terms</a>
                  </span>
                </label>
              </div>
              <button onClick={handleTextQuote} disabled={!smsConsent || !smsPhone.replace(/\D/g, '').length}
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: smsConsent && smsPhone.replace(/\D/g, '').length >= 10 ? '#16a34a' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '700', letterSpacing: '1px',
                  cursor: smsConsent && smsPhone.replace(/\D/g, '').length >= 10 ? 'pointer' : 'not-allowed'
                }}>
                SEND TEXT
              </button>
            </div>
          </div>
        )}

        {/* ═══ CONTENT ═══ */}
        <div className="quote-content" style={{ padding: '24px 28px' }}>

          {/* Customer + Vehicle */}
          <div className="info-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #cbd5e1' }}>
            <div>
              <div style={sectionLabel}>PREPARED FOR</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                {customer?.full_name || 'Valued Customer'}
              </div>
              {customer?.phone && (
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500', marginBottom: '2px' }}>
                  📞 {customer.phone_formatted || formatPhone(customer.phone)}
                </div>
              )}
              {customer?.email && (
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                  ✉️ {customer.email}
                </div>
              )}
            </div>
            <div>
              <div style={sectionLabel}>VEHICLE</div>
              {hasVehicleInfo ? (
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{quote.vehicle.display}</div>
              ) : (
                <div style={{ fontSize: '14px', color: '#1e293b', fontStyle: 'italic' }}>Vehicle Make/Model Not Verified</div>
              )}
              {customer?.license_plate && (
                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500', marginTop: '4px' }}>
                  Plate: {customer.license_plate} ({customer.license_state || 'CA'})
                </div>
              )}
              {quote.vehicle?.oe_tire_size && (
                <div style={{ fontSize: '11.5px', color: '#1e293b', fontWeight: '500', marginTop: '4px' }}>
                  OE Size: {quote.vehicle.oe_tire_size}
                  {quote.vehicle.oe_load_rating && ` | Load: ${quote.vehicle.oe_load_rating}`}
                  {quote.vehicle.oe_speed_rating && ` | Speed: ${quote.vehicle.oe_speed_rating}`}
                </div>
              )}
            </div>
          </div>

          {/* ─── Recommended Tire Card ─── */}
          <div style={{ border: '2px solid #cbd5e1', borderLeft: '5px solid #8b1538', borderRadius: '10px', padding: '18px 22px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '700', letterSpacing: '1px', marginBottom: '3px' }}>
                {tire?.brand} • {tire?.size} {tire?.load_range && tire.load_range}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                {tire?.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tire?.speed_rating && (
                  <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>
                    Speed: {tire.speed_rating}
                  </span>
                )}
                {tire?.load_rating && (
                  <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>
                    Load: {tire.load_rating}
                  </span>
                )}
                {tire?.snowflake && (
                  <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>
                    ❄️ 3PMSF
                  </span>
                )}
                {tire?.part_number && (
                  <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>
                    Part# {tire.part_number}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700' }}>Qty: {p?.quantity}</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b1538', lineHeight: 1 }}>{formatCurrency(p?.price_per_tire)}</div>
              <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600', marginTop: '2px' }}>per tire</div>
            </div>
          </div>

          {/* ─── Warranty + Promo Row ─── */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#1e293b', fontWeight: '500', flex: 1, minWidth: '180px' }}>
              {tire?.warranty_miles ? (
                <span>✓ <strong>{parseInt(tire.warranty_miles).toLocaleString()} Mile</strong> Tread Life Warranty</span>
              ) : (
                <em>No specified tread life warranty</em>
              )}
            </div>
            {p?.promo_discount > 0 && (
              <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '13px', color: '#166534', fontWeight: '700', marginBottom: '2px' }}>
                  {p?.promo_name || 'Promotion Applied'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                  You're saving {formatCurrency(p?.promo_discount)}
                </div>
              </div>
            )}
          </div>

          {/* ─── Tread + Pricing Side by Side ─── */}
          <div className="tread-pricing-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
            
            {/* LEFT: Tread Condition */}
            <div className="tread-column">
              {treadData && (
                <>
                  <div style={sectionLabel}>CURRENT TIRE CONDITION</div>
                  <TreadDiagram treadData={treadData} />
                </>
              )}
            </div>

            {/* RIGHT: Pricing */}
            <div className="pricing-column">
              <div style={sectionLabel}>PRICING</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Tires ({formatCurrency(p?.price_per_tire)} × {p?.quantity})</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_tires)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Mount & Balance ({formatCurrency(p?.mount_balance_per_tire)} × {p?.quantity})</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_mount_balance)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Road Hazard Protection ({formatCurrency(p?.road_hazard_per_tire)} × {p?.quantity})</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_road_hazard)}</td>
                  </tr>
                  {(p?.subtotal_disposal > 0 || p?.disposal_per_tire > 0) && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Tire Disposal Fee ({formatCurrency(p?.disposal_per_tire || 2.50)} × {p?.quantity})</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_disposal || (2.50 * p?.quantity))}</td>
                    </tr>
                  )}
                  {(p?.subtotal_ca_state_fee > 0 || p?.ca_state_fee_per_tire > 0) && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>CA State Tire Fee ({formatCurrency(p?.ca_state_fee_per_tire || 1.75)} × {p?.quantity})</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_ca_state_fee || (1.75 * p?.quantity))}</td>
                    </tr>
                  )}
                  {p?.subtotal_fet > 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Federal Excise Tax (FET)</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_fet)}</td>
                    </tr>
                  )}
                  {p?.promo_discount > 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>Discount {p?.promo_name && `(${p.promo_name})`}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>-{formatCurrency(p?.promo_discount)}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Sales Tax ({((p?.tax_rate || 0) * 100).toFixed(2)}%)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.tax_amount)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '10px 4px', fontSize: '16px', fontWeight: '700', color: '#1e293b', borderBottom: 'none' }}>TOTAL</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: '22px', fontWeight: '700', color: '#8b1538', borderBottom: 'none' }}>{formatCurrency(p?.total_amount)}</td>
                  </tr>
                  {p?.rebate_amount > 0 && (
                    <>
                      <tr>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>Less Rebate {p?.rebate_description && `(${p.rebate_description})`}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>-{formatCurrency(p?.rebate_amount)}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <td style={{ padding: '10px 4px', fontSize: '14px', fontWeight: '700', color: '#16a34a', borderBottom: 'none' }}>YOUR PRICE AFTER REBATE</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: '18px', fontWeight: '700', color: '#16a34a', borderBottom: 'none' }}>{formatCurrency(p?.total_after_rebate)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                That's just <strong style={{ color: '#8b1538', fontSize: '17px' }}>{formatCurrency(p?.per_tire_installed)}</strong> per tire installed!
              </div>
            </div>
          </div>

          {/* Action Message */}
          {actionMessage && (
            <div data-print-hide="true" style={{
              padding: '12px 20px', borderRadius: '8px', marginBottom: '16px',
              backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
              color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
              textAlign: 'center', fontSize: '14px', fontWeight: '500'
            }}>
              {actionMessage.text}
            </div>
          )}

          {/* ─── Action Buttons ─── */}
          <div data-print-hide="true" style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            {store?.appointment_url && (
              <a href={store.appointment_url} target="_blank" rel="noopener noreferrer"
                style={{ backgroundColor: '#8b1538', color: 'white', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '12.5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '85px', textAlign: 'center', lineHeight: '1.3' }}>
                <span>📅 Schedule</span><span>Installation</span>
              </a>
            )}
            {store?.phone && (
              <a href={`tel:${store.phone}`}
                style={{ backgroundColor: 'white', color: '#1e293b', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '12.5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', border: '2px solid #cbd5e1', minWidth: '85px', textAlign: 'center', lineHeight: '1.3' }}>
                <span>📞 Call</span><span>Store</span>
              </a>
            )}
            <button onClick={handleEmailQuote} disabled={sendingEmail}
              style={{ backgroundColor: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '12.5px', cursor: sendingEmail ? 'not-allowed' : 'pointer', opacity: sendingEmail ? 0.7 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '85px', textAlign: 'center', lineHeight: '1.3' }}>
              <span>{sendingEmail ? '...' : '✉️ Email'}</span><span>Quote</span>
            </button>
            <button onClick={openSmsModal} disabled={sendingSms}
              style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '12.5px', cursor: sendingSms ? 'not-allowed' : 'pointer', opacity: sendingSms ? 0.7 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '85px', textAlign: 'center', lineHeight: '1.3' }}>
              <span>{sendingSms ? '...' : '💬 Text'}</span><span>Quote</span>
            </button>
            <button onClick={handlePayOnline} disabled={sendingInvoice}
              style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '12.5px', cursor: sendingInvoice ? 'not-allowed' : 'pointer', opacity: sendingInvoice ? 0.7 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '85px', textAlign: 'center', lineHeight: '1.3' }}>
              <span>{sendingInvoice ? '...' : '💳 Pay'}</span><span>Now</span>
            </button>
          </div>

          {/* ─── Staff Buttons ─── */}
          <div data-print-hide="true" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            {quote.is_editable && !editMode && (
              <button onClick={enterEditMode} style={{ backgroundColor: 'white', color: '#9b59b6', border: '2px solid #9b59b6', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.5px' }}>
                ✏️ Edit Quote
              </button>
            )}
            {editMode && (
              <>
                <button onClick={handleSaveEdit} disabled={saving}
                  style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}>
                  {saving ? 'SAVING...' : '✓ SAVE CHANGES'}
                </button>
                <button onClick={() => setEditMode(false)}
                  style={{ backgroundColor: 'white', color: '#dc2626', border: '2px solid #dc2626', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  CANCEL
                </button>
              </>
            )}
            <button onClick={handleReQuote} style={{ backgroundColor: 'white', color: '#1d4ed8', border: '2px solid #1d4ed8', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.5px' }}>
              🔄 Re-Quote
            </button>
            <button onClick={() => { window.location.hash = '#/'; }} style={{ backgroundColor: 'white', color: '#16a34a', border: '2px solid #16a34a', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.5px' }}>
              ➕ New Quote
            </button>
          </div>

          {/* ─── Edit Mode Fields ─── */}
          {editMode && (
            <div data-print-hide="true" style={{ backgroundColor: '#faf5ff', border: '2px solid #9b59b6', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#9b59b6', fontSize: '13px', fontWeight: '700', textAlign: 'center', letterSpacing: '1px' }}>
                EDITING QUOTE
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>FIRST NAME</label>
                  <input value={editCustomer.first_name || ''} onChange={(e) => setEditCustomer({...editCustomer, first_name: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>LAST NAME</label>
                  <input value={editCustomer.last_name || ''} onChange={(e) => setEditCustomer({...editCustomer, last_name: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PHONE</label>
                  <input value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                  <input value={editCustomer.email || ''} onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>QTY</label>
                  <select value={editQuantity} onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PROMOTION</label>
                  <select value={editPromo} onChange={(e) => setEditPromo(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}>
                    <option value="">None</option>
                    <option value="FREE_INSTALL">Free Installation</option>
                    <option value="10PCT_TIRES">10% Off Tires</option>
                    <option value="NEXEN_B3G1">Buy 3 Nexen Get 1 Free</option>
                    <option value="MILITARY_15">Military Discount (15%)</option>
                    <option value="FIRST_RESP_12">First Responder (12%)</option>
                    <option value="SENIOR_12">Senior 55+ (12%)</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '10px', color: '#9b59b6', margin: '0', textAlign: 'center', fontStyle: 'italic' }}>
                Tire, vehicle, and store cannot be changed. Use "Re-Quote" to change those.
              </p>

              {/* Tread Depth Editing */}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e9d5f5' }}>
                <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '8px', textAlign: 'center' }}>TREAD DEPTHS (32nds)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { key: 'lf', label: 'Driver Front' },
                    { key: 'rf', label: 'Pass Front' },
                    { key: 'lr', label: 'Driver Rear' },
                    { key: 'rr', label: 'Pass Rear' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ backgroundColor: '#f3e8ff', borderRadius: '6px', padding: '6px 8px' }}>
                      <div style={{ fontSize: '9px', color: '#9b59b6', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['inside', 'middle', 'outside'].map(pos => (
                          <input key={pos} value={editTreadDepths[key][pos]}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                              setEditTreadDepths(prev => ({ ...prev, [key]: { ...prev[key], [pos]: v } }));
                            }}
                            placeholder={pos[0].toUpperCase()}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box' }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '7px', color: '#1e293b' }}>IN</span>
                        <span style={{ fontSize: '7px', color: '#1e293b' }}>MID</span>
                        <span style={{ fontSize: '7px', color: '#1e293b' }}>OUT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Compare Your Options ─── */}
          {quote.alternatives && (
            <div className="comparison-card" style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionLabel, textAlign: 'center' }}>COMPARE YOUR OPTIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: quote.alternatives.good && quote.alternatives.best ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                {/* Good */}
                {quote.alternatives.good && (
                  <div style={{ border: '2px solid #86efac', borderRadius: '10px', padding: '16px 12px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', letterSpacing: '1.5px', marginBottom: '8px' }}>GOOD</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>{quote.alternatives.good.brand}</div>
                    <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', marginBottom: '6px' }}>{quote.alternatives.good.name}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a', marginBottom: '2px' }}>
                      {formatCurrency(quote.alternatives.good.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '500', color: '#1e293b' }}>/tire</span>
                    </div>
                    {quote.alternatives.good.warranty_miles && (
                      <div style={{ fontSize: '10.5px', color: '#1e293b', fontWeight: '600', marginBottom: '8px' }}>
                        {parseInt(quote.alternatives.good.warranty_miles).toLocaleString()} mi warranty
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(quote.alternatives.good.total_installed)}</div>
                      <div style={{ fontSize: '9px', color: '#1e293b', fontWeight: '600' }}>total installed</div>
                    </div>
                  </div>
                )}

                {/* Recommended */}
                <div style={{ border: '3px solid #8b1538', borderRadius: '10px', padding: '16px 12px', textAlign: 'center', backgroundColor: '#fdf2f8', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#8b1538', color: 'white', padding: '2px 14px', borderRadius: '10px', fontSize: '9px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap' }}>⭐ RECOMMENDED</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#8b1538', letterSpacing: '1.5px', marginBottom: '8px', marginTop: '4px' }}>CHOSEN</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>{tire?.brand}</div>
                  <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', marginBottom: '6px' }}>{tire?.name}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b1538', marginBottom: '2px' }}>
                    {formatCurrency(p?.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '500', color: '#1e293b' }}>/tire</span>
                  </div>
                  {tire?.warranty_miles ? (
                    <div style={{ fontSize: '10.5px', color: '#1e293b', fontWeight: '600', marginBottom: '8px' }}>
                      {parseInt(tire.warranty_miles).toLocaleString()} mi warranty
                    </div>
                  ) : (
                    <div style={{ fontSize: '10.5px', color: '#1e293b', fontWeight: '500', fontStyle: 'italic', marginBottom: '8px' }}>No tread life warranty</div>
                  )}
                  <div style={{ borderTop: '1px solid #f9a8b8', paddingTop: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8b1538' }}>{formatCurrency(p?.total_amount)}</div>
                    <div style={{ fontSize: '9px', color: '#1e293b', fontWeight: '600' }}>total installed</div>
                  </div>
                </div>

                {/* Best */}
                {quote.alternatives.best && (
                  <div style={{ border: '2px solid #93c5fd', borderRadius: '10px', padding: '16px 12px', textAlign: 'center', backgroundColor: '#eff6ff' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', letterSpacing: '1.5px', marginBottom: '8px' }}>BEST</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>{quote.alternatives.best.brand}</div>
                    <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', marginBottom: '6px' }}>{quote.alternatives.best.name}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb', marginBottom: '2px' }}>
                      {formatCurrency(quote.alternatives.best.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '500', color: '#1e293b' }}>/tire</span>
                    </div>
                    {quote.alternatives.best.warranty_miles && (
                      <div style={{ fontSize: '10.5px', color: '#1e293b', fontWeight: '600', marginBottom: '8px' }}>
                        {parseInt(quote.alternatives.best.warranty_miles).toLocaleString()} mi warranty
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(quote.alternatives.best.total_installed)}</div>
                      <div style={{ fontSize: '9px', color: '#1e293b', fontWeight: '600' }}>total installed</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warranty Disclaimer */}
          {tire?.warranty_miles && (
            <div className="warranty-disclaimer" style={{
              backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px',
              padding: '10px 14px', marginBottom: '14px', fontSize: '10.5px', color: '#1e293b', lineHeight: '1.5', fontWeight: '500'
            }}>
              <strong>Tread Wear Warranty Note:</strong> Tire treadwear warranties are not "free replacement" warranties. 
              They are generally prorated discounts based on how early the tires wore out compared to their promised lifespan. 
              Manufacturer's require proof of tire rotations based on the vehicle OEM's schedule and correct vehicle alignment. 
              Road hazards, abuse and neglect are not covered.
            </div>
          )}

          {/* Footer */}
          <div className="quote-footer" style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '12px', fontSize: '11px', color: '#555', fontWeight: '500', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 4px 0' }}>This quote is valid for 7 days. Prices subject to change based on availability.</p>
            <p style={{ margin: '0' }}>Quote #{quote.quote_number} • {formatDate(quote.created_at)} • {store?.name} • tires.myjiffylube.ai</p>
          </div>
        </div>
      </div>

      {/* Legal Footer - screen only */}
      <div className="no-print" style={{ textAlign: 'center', padding: '16px', color: '#555', fontSize: '10px' }}>
        <a href="#/privacy-policy" style={{ color: '#555', textDecoration: 'none', marginRight: '12px' }}>Privacy Policy</a>
        <a href="#/terms" style={{ color: '#555', textDecoration: 'none', marginRight: '12px' }}>Terms & Conditions</a>
        <a href="#/contact" style={{ color: '#555', textDecoration: 'none', marginRight: '12px' }}>Contact</a>
        <a href="#/do-not-sell" style={{ color: '#555', textDecoration: 'none' }}>Do Not Sell My Info</a>
        <p style={{ marginTop: '6px', marginBottom: '0' }}>© 2026 P.C.J.L., Inc. • Jiffy Lube MultiCare • tires.myjiffylube.ai</p>
      </div>

      {/* ═══ PRINT STYLES ═══ Portrait, 1-page */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 0.3in;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          div, table, tr, td, p, h1, h2, h3, h4 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          [data-print-hide="true"] { display: none !important; }
          .no-print { display: none !important; }
          button { display: none !important; }
          div { box-shadow: none !important; }
          a[href]:after { content: none !important; }
          
          .quote-outer-container {
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
          }
          
          .quote-main-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          
          .quote-header {
            padding: 10px 18px !important;
            border-top-width: 4px !important;
          }
          
          .quote-header img { height: 30px !important; }
          
          .quote-content { padding: 14px 18px !important; }
          
          .info-row {
            margin-bottom: 12px !important;
            padding-bottom: 10px !important;
          }
          
          .tread-pricing-row {
            gap: 16px !important;
            margin-bottom: 12px !important;
          }
          
          .comparison-card {
            margin-bottom: 10px !important;
            page-break-inside: avoid !important;
          }
          
          .warranty-disclaimer {
            padding: 6px 10px !important;
            font-size: 8.5px !important;
            margin-bottom: 8px !important;
          }
          
          .quote-footer {
            padding-top: 8px !important;
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuoteView;
