// =============================================================================
// QUOTE VIEW - Customer-Facing Quote Display v4
// =============================================================================
// Route: #/quote/:code
// Updated: 2026-02-11
// v4 Changes:
//   - SMS consent modal (replaces Coming Soon text button)
//   - Pay Now button enabled (replaces Coming Soon)
//   - Same-day edit mode (quantity, promo, customer info)
//   - Revise quote button (navigates to QuoteBuilder with pre-fill)
//   - Revision chain banner (revised from / revised to links)
//   - Edit tracking display (last edited by/at)
//   - Good/Better/Best comparison card
// =============================================================================

import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';
const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';
const CAR_IMAGE = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/Vehicle-image.png';

// Tread status thresholds: 0-4 red, 5-6 yellow, 7+ green
const getTreadInfo = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth <= 4) return { status: 'replace', color: '#dc2626', bgColor: '#fef2f2', label: 'REPLACE NOW' };
  if (depth <= 6) return { status: 'consider', color: '#d97706', bgColor: '#fffbeb', label: 'CONSIDER REPLACEMENT' };
  return { status: 'good', color: '#16a34a', bgColor: '#f0fdf4', label: 'GOOD' };
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

// Single tire tread display component
const TireTreadBadge = ({ label, position, data }) => {
  if (!data) return null;
  const info = getTreadInfo(data.lowest);
  if (!info) return null;

  return (
    <div style={{
      backgroundColor: info.bgColor,
      border: `2px solid ${info.color}`,
      borderRadius: '8px',
      padding: '8px 12px',
      textAlign: 'center',
      minWidth: '90px'
    }}>
      <div style={{ fontSize: '10px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: info.color }}>{data.lowest}<span style={{ fontSize: '12px' }}>/32</span></div>
      <div style={{ fontSize: '8px', color: info.color, fontWeight: '600' }}>{info.label}</div>
    </div>
  );
};

// Stopping Distance Comparison Chart
const StoppingDistanceChart = ({ currentDistance, newDistance }) => {
  if (!currentDistance) return null;
  
  const maxDistance = 400; // Max for scale
  const currentPercent = (currentDistance / maxDistance) * 100;
  const newPercent = (newDistance / maxDistance) * 100;
  const difference = currentDistance - newDistance;

  return (
    <div style={{ 
      backgroundColor: '#f8fafc', 
      borderRadius: '12px', 
      padding: '20px',
      marginTop: '15px'
    }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#64748b', 
        fontSize: '11px', 
        fontWeight: '700', 
        letterSpacing: '1px',
        textAlign: 'center'
      }}>
        STOPPING DISTANCE COMPARISON (60 MPH, WET ROAD)
      </h4>
      
      {/* Current Tires */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Your Current Tires</span>
          <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: '700' }}>{currentDistance} ft</span>
        </div>
        <div style={{ 
          backgroundColor: '#fee2e2', 
          borderRadius: '6px', 
          height: '24px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${currentPercent}%`,
            height: '100%',
            backgroundColor: '#dc2626',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '8px',
            transition: 'width 0.5s ease'
          }}>
            <span style={{ color: 'white', fontSize: '10px', fontWeight: '700' }}>⚠️ LONGER</span>
          </div>
        </div>
      </div>

      {/* New Tires */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>With New Tires</span>
          <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: '700' }}>{newDistance} ft</span>
        </div>
        <div style={{ 
          backgroundColor: '#dcfce7', 
          borderRadius: '6px', 
          height: '24px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${newPercent}%`,
            height: '100%',
            backgroundColor: '#16a34a',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '8px',
            transition: 'width 0.5s ease'
          }}>
            <span style={{ color: 'white', fontSize: '10px', fontWeight: '700' }}>✓ SHORTER</span>
          </div>
        </div>
      </div>

      {/* Difference callout */}
      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '13px', color: '#92400e' }}>
          New tires could reduce your stopping distance by <strong>{difference} feet</strong> — that's about <strong>{Math.round(difference / 8)} car lengths</strong>!
        </span>
      </div>
    </div>
  );
};

// Car diagram with tread readings - car facing LEFT, viewed from above
const CarTreadDiagram = ({ treadData }) => {
  if (!treadData) return null;

  // Map from stored format (tires.front_left) to component format (lf)
  const tires = treadData.tires || {};
  const lf = tires.front_left || treadData.lf;
  const rf = tires.front_right || treadData.rf;
  const lr = tires.rear_left || treadData.lr;
  const rr = tires.rear_right || treadData.rr;

  return (
    <div style={{ 
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Direction indicator */}
      <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>
        ← FRONT OF VEHICLE
      </div>
      
      {/* Main diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
        
        {/* Left side - Front tires (Passenger top, Driver bottom) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <TireTreadBadge label="PASS FRONT" position="rf" data={rf} />
          <TireTreadBadge label="DRIVER FRONT" position="lf" data={lf} />
        </div>

        {/* Car image */}
        <div style={{ padding: '0 10px' }}>
          <img 
            src={CAR_IMAGE}
            alt="Vehicle"
            style={{ width: '100%', maxWidth: '280px', opacity: 0.7 }}
          />
        </div>

        {/* Right side - Rear tires */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <TireTreadBadge label="PASS REAR" position="rr" data={rr} />
          <TireTreadBadge label="DRIVER REAR" position="lr" data={lr} />
        </div>
      </div>

      {/* Summary */}
      {treadData.summary && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: '20px', 
          marginTop: '15px',
          fontSize: '12px',
          flexWrap: 'wrap'
        }}>
          {treadData.summary.replace_count > 0 && (
            <span style={{ color: '#dc2626', fontWeight: '600' }}>
              🔴 {treadData.summary.replace_count} tire{treadData.summary.replace_count > 1 ? 's' : ''} need replacement
            </span>
          )}
          {treadData.summary.consider_count > 0 && (
            <span style={{ color: '#d97706', fontWeight: '600' }}>
              🟡 {treadData.summary.consider_count} tire{treadData.summary.consider_count > 1 ? 's' : ''} to monitor
            </span>
          )}
          {treadData.summary.ok_count > 0 && (
            <span style={{ color: '#16a34a', fontWeight: '600' }}>
              🟢 {treadData.summary.ok_count} tire{treadData.summary.ok_count > 1 ? 's' : ''} good
            </span>
          )}
        </div>
      )}

      {/* Stopping Distance Chart */}
      {(treadData.summary?.stopping_distance_current || treadData.stopping_distance_current) && (
        <StoppingDistanceChart 
          currentDistance={treadData.summary?.stopping_distance_current || treadData.stopping_distance_current} 
          newDistance={treadData.summary?.stopping_distance_new || treadData.stopping_distance_new || 195} 
        />
      )}
    </div>
  );
};

// Main QuoteView Component
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
            // Populate edit fields directly from data (quote state not yet updated)
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
        body: JSON.stringify({
          key: API_KEY,
          quote_id: quote.quote_id,
          email_override: email
        })
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
    // Check if customer has email
    let customerEmail = quote?.customer?.email;
    
    if (!customerEmail) {
      customerEmail = prompt('Enter your email address to receive the PayPal invoice:');
      if (!customerEmail) return;
      
      // Basic email validation
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
        body: JSON.stringify({
          key: API_KEY,
          quote_id: quote.quote_id
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionMessage({ 
          type: 'success', 
          text: `PayPal invoice sent to ${customerEmail}! Check your email to pay securely.` 
        });
      } else {
        if (data.error?.includes('email is required')) {
          setActionMessage({ 
            type: 'error', 
            text: 'Email address is required to send invoice. Please contact the store.' 
          });
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

  // Enter edit mode - populate edit fields from current quote
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
    // Pre-fill tread depths from existing data
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

  // Save edits via update-quote
  const handleSaveEdit = async () => {
    setSaving(true);
    setActionMessage(null);
    try {
      const phoneDigits = editCustomer.phone.replace(/\D/g, '');

      // Build tread depth object if any values filled
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
        // Show promo warning if one was auto-removed
        const msg = data.promo_warning 
          ? `Quote updated! Note: ${data.promo_warning}`
          : 'Quote updated successfully!';
        setActionMessage({ type: 'success', text: msg });
        setEditMode(false);
        // Reload the quote to get fresh data
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

  // Handle re-quote - stash quote data to sessionStorage, navigate to TireFinder
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
    window.location.hash = '#/';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: "'Segoe UI', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <div>Loading quote...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: "'Segoe UI', sans-serif"
      }}>
        <div style={{ 
          textAlign: 'center', 
          backgroundColor: '#fef2f2', 
          padding: '40px', 
          borderRadius: '12px',
          border: '1px solid #fecaca'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>Quote Not Found</h2>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  const p = quote.pricing;
  const store = quote.store;
  const customer = quote.customer;
  const treadData = quote.tread_depth;
  const tire = quote.tire;

  // Check if vehicle info was provided
  const hasVehicleInfo = quote.vehicle?.display && 
    quote.vehicle.display !== '' && 
    !quote.vehicle.display.toLowerCase().includes('unknown');

  return (
    <div 
      className="quote-outer-container"
      style={{ 
      fontFamily: "'Segoe UI', sans-serif", 
      backgroundColor: '#f1f5f9', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div 
        className="quote-main-container"
        style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div 
          className="quote-header"
          style={{ 
          backgroundColor: '#8b1538', 
          color: 'white', 
          padding: '25px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <img 
              src={JL_LOGO} 
              alt="Jiffy Lube Multicare" 
              style={{ height: '50px', marginBottom: '15px', filter: 'brightness(0) invert(1)' }} 
            />
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <div style={{ fontWeight: '600', marginBottom: '3px' }}>{store?.name}</div>
              <div>{store?.full_address}</div>
              <div>{store?.phone_formatted || formatPhone(store?.phone)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', opacity: 0.7, letterSpacing: '1px', marginBottom: '5px' }}>TIRE QUOTE</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{quote.quote_number}</div>
            <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.9 }}>
              Valid until: {formatDate(quote.expires_at)}
            </div>
            {quote.is_expired && (
              <div style={{ 
                backgroundColor: '#fbbf24', 
                color: '#78350f', 
                padding: '4px 10px', 
                borderRadius: '4px', 
                fontSize: '11px', 
                fontWeight: '700',
                marginTop: '8px',
                display: 'inline-block'
              }}>
                EXPIRED
              </div>
            )}
            {/* Print Button - hidden on print */}
            <button
              data-print-hide="true"
              onClick={() => window.print()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '6px 14px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '12px',
                marginLeft: 'auto'
              }}
            >
              🖨️ Print Quote
            </button>
          </div>
        </div>

        {/* Revision Chain Banner */}
        {quote.revision && (
          <div data-print-hide="true" style={{ 
            backgroundColor: '#eff6ff', 
            borderBottom: '1px solid #bfdbfe', 
            padding: '10px 30px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '20px', 
            fontSize: '12px',
            flexWrap: 'wrap'
          }}>
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
          <div data-print-hide="true" style={{ 
            backgroundColor: '#fefce8', 
            borderBottom: '1px solid #fde68a', 
            padding: '8px 30px', 
            textAlign: 'center', 
            fontSize: '11px', 
            color: '#854d0e' 
          }}>
            Last edited by {quote.edit_history.last_edited_by} on {formatDate(quote.edit_history.last_edited_at)}
          </div>
        )}

        {/* SMS Consent Modal */}
        {showSmsModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: '15px', padding: '30px',
              width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#16a34a', fontSize: '18px', fontWeight: '700' }}>Text This Quote</h3>
                <button onClick={() => setShowSmsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>×</button>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '11px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '6px' }}>PHONE NUMBER</label>
                <input
                  type="tel"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="(805) 555-1234"
                  style={{
                    width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '16px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#16a34a' }}
                  />
                  <span style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                    I consent to receive this tire quote and related service messages from Jiffy Lube via SMS. 
                    Msg & data rates may apply. Reply STOP to opt out.{' '}
                    <a href="#/sms-consent" target="_blank" style={{ color: '#16a34a' }}>SMS Terms</a>
                  </span>
                </label>
              </div>

              <button
                onClick={handleTextQuote}
                disabled={!smsConsent || !smsPhone.replace(/\D/g, '').length}
                style={{
                  width: '100%', padding: '14px',
                  backgroundColor: smsConsent && smsPhone.replace(/\D/g, '').length >= 10 ? '#16a34a' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '700', letterSpacing: '1px',
                  cursor: smsConsent && smsPhone.replace(/\D/g, '').length >= 10 ? 'pointer' : 'not-allowed'
                }}
              >
                SEND TEXT
              </button>
            </div>
          </div>
        )}
        <div className="quote-content" style={{ padding: '30px' }}>
          
          {/* Print Left Column - Customer, Vehicle, Tread, Stopping Distance */}
          <div className="print-column-left">
          
          {/* Customer & Vehicle Row */}
          <div 
            className="customer-vehicle-row"
            style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '25px',
            marginBottom: '30px',
            paddingBottom: '25px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            {/* Customer Info */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
                PREPARED FOR
              </h4>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>
                {customer?.full_name || 'Valued Customer'}
              </div>
              {customer?.phone && (
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '3px' }}>
                  📞 {customer.phone_formatted || formatPhone(customer.phone)}
                </div>
              )}
              {customer?.email && (
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  ✉️ {customer.email}
                </div>
              )}
            </div>

            {/* Vehicle Info */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
                VEHICLE
              </h4>
              {hasVehicleInfo ? (
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  {quote.vehicle.display}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Vehicle Make/Model Not Verified
                </div>
              )}
              {customer?.license_plate && (
                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
                  Plate: {customer.license_plate} ({customer.license_state || 'CA'})
                </div>
              )}
              {quote.vehicle?.oe_tire_size && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                  OE Size: {quote.vehicle.oe_tire_size}
                  {quote.vehicle.oe_load_rating && ` | Load: ${quote.vehicle.oe_load_rating}`}
                  {quote.vehicle.oe_speed_rating && ` | Speed: ${quote.vehicle.oe_speed_rating}`}
                </div>
              )}
            </div>
          </div>

          {/* Tread Depth Section */}
          {treadData && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
                CURRENT TIRE CONDITION
              </h4>
              <CarTreadDiagram treadData={treadData} />
            </div>
          )}
          
          </div>{/* End print-column-left */}
          
          {/* Print Right Column - Tire Info, Pricing, Warranty */}
          <div className="print-column-right">

          {/* Recommended Tire */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
              RECOMMENDED TIRES
            </h4>
            <div style={{ 
              backgroundColor: '#8b1538', 
              borderRadius: '10px', 
              padding: '20px 25px', 
              color: 'white' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700' }}>
                    {tire?.brand} {tire?.name}
                  </h3>
                  <p style={{ margin: '0', opacity: 0.9, fontSize: '14px' }}>
                    {tire?.size} • Part# {tire?.part_number}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tire?.speed_rating && (
                      <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '15px', fontSize: '11px' }}>
                        Speed: {tire.speed_rating}
                      </span>
                    )}
                    {tire?.load_rating && (
                      <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '15px', fontSize: '11px' }}>
                        Load: {tire.load_rating}
                      </span>
                    )}
                    {tire?.snowflake && (
                      <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '15px', fontSize: '11px' }}>
                        ❄️ 3PMSF
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Qty: {p?.quantity}</div>
                  <div style={{ fontSize: '28px', fontWeight: '700' }}>{formatCurrency(p?.price_per_tire)}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>per tire</div>
                </div>
              </div>
            </div>
            
            {/* Warranty Info */}
            <div style={{ 
              marginTop: '10px', 
              padding: '12px 15px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px',
              fontSize: '13px',
              color: '#64748b'
            }}>
              {tire?.warranty_miles ? (
                <span>✓ <strong>{parseInt(tire.warranty_miles).toLocaleString()} Mile</strong> Tread Life Warranty</span>
              ) : (
                <span style={{ fontStyle: 'italic' }}>No specified tread life warranty</span>
              )}
            </div>
          </div>

          {/* Savings Banner (if promo applied) */}
          {p?.promo_discount > 0 && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #16a34a',
              borderRadius: '10px',
              padding: '18px 20px',
              marginBottom: '25px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', color: '#166534', marginBottom: '5px', fontWeight: '600' }}>
                {p?.promo_name || 'Promotion Applied'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>
                You're saving {formatCurrency(p?.promo_discount)}
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
              PRICING
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                    Tires ({formatCurrency(p?.price_per_tire)} × {p?.quantity})
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    {formatCurrency(p?.subtotal_tires)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                    Mount & Balance ({formatCurrency(p?.mount_balance_per_tire)} × {p?.quantity})
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                    {formatCurrency(p?.subtotal_mount_balance)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                    Road Hazard Protection ({formatCurrency(p?.road_hazard_per_tire)} × {p?.quantity})
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                    {formatCurrency(p?.subtotal_road_hazard)}
                  </td>
                </tr>
                {(p?.subtotal_disposal > 0 || p?.disposal_per_tire > 0) && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                      Tire Disposal Fee ({formatCurrency(p?.disposal_per_tire || 2.50)} × {p?.quantity})
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                      {formatCurrency(p?.subtotal_disposal || (2.50 * p?.quantity))}
                    </td>
                  </tr>
                )}
                {(p?.subtotal_ca_state_fee > 0 || p?.ca_state_fee_per_tire > 0) && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                      CA State Tire Fee ({formatCurrency(p?.ca_state_fee_per_tire || 1.75)} × {p?.quantity})
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                      {formatCurrency(p?.subtotal_ca_state_fee || (1.75 * p?.quantity))}
                    </td>
                  </tr>
                )}
                {p?.subtotal_fet > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                      Federal Excise Tax (FET)
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                      {formatCurrency(p?.subtotal_fet)}
                    </td>
                  </tr>
                )}
                {p?.promo_discount > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#16a34a' }}>
                      Discount {p?.promo_name && `(${p.promo_name})`}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                      -{formatCurrency(p?.promo_discount)}
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                    Sales Tax ({((p?.tax_rate || 0) * 100).toFixed(2)}%)
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#1e293b' }}>
                    {formatCurrency(p?.tax_amount)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '15px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                    TOTAL
                  </td>
                  <td style={{ padding: '15px 0', textAlign: 'right', fontSize: '24px', fontWeight: '700', color: '#8b1538' }}>
                    {formatCurrency(p?.total_amount)}
                  </td>
                </tr>
                {p?.rebate_amount > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '12px 0', fontSize: '14px', color: '#16a34a' }}>
                        Less Rebate {p?.rebate_description && `(${p.rebate_description})`}
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                        -{formatCurrency(p?.rebate_amount)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td style={{ padding: '15px 0', fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>
                        YOUR PRICE AFTER REBATE
                      </td>
                      <td style={{ padding: '15px 0', textAlign: 'right', fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                        {formatCurrency(p?.total_after_rebate)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            
            {/* Per tire installed callout */}
            <div style={{ 
              marginTop: '15px', 
              textAlign: 'center', 
              backgroundColor: '#f8fafc', 
              padding: '12px', 
              borderRadius: '8px' 
            }}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>
                That's just <strong style={{ color: '#8b1538', fontSize: '18px' }}>{formatCurrency(p?.per_tire_installed)}</strong> per tire installed!
              </span>
            </div>
          </div>

          {/* Action Message */}
          {actionMessage && (
            <div 
              data-print-hide="true"
              style={{
              padding: '12px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
              color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              {actionMessage.text}
            </div>
          )}

          {/* Action Buttons - Hidden on Print */}
          <div 
            data-print-hide="true"
            style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '25px'
          }}>
            {store?.appointment_url && (
              <a 
                href={store.appointment_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: '#8b1538',
                  color: 'white',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  minWidth: '90px',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}
              >
                <span>📅 Schedule</span>
                <span>Installation</span>
              </a>
            )}
            {store?.phone && (
              <a 
                href={`tel:${store.phone}`}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  border: '2px solid #e2e8f0',
                  minWidth: '90px',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}
              >
                <span>📞 Call</span>
                <span>Store</span>
              </a>
            )}
            <button
              onClick={handleEmailQuote}
              disabled={sendingEmail}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: sendingEmail ? 'not-allowed' : 'pointer',
                opacity: sendingEmail ? 0.7 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '90px',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              <span>{sendingEmail ? '...' : '✉️ Email'}</span>
              <span>Quote</span>
            </button>
            <button
              onClick={openSmsModal}
              disabled={sendingSms}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: sendingSms ? 'not-allowed' : 'pointer',
                opacity: sendingSms ? 0.7 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '90px',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              <span>{sendingSms ? '...' : '💬 Text'}</span>
              <span>Quote</span>
            </button>
            <button
              onClick={handlePayOnline}
              disabled={sendingInvoice}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: sendingInvoice ? 'not-allowed' : 'pointer',
                opacity: sendingInvoice ? 0.7 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '90px',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              <span>{sendingInvoice ? '...' : '💳 Pay'}</span>
              <span>Now</span>
            </button>
          </div>

          {/* Edit / Re-Quote Buttons - Staff Only */}
          <div 
            data-print-hide="true"
            style={{ 
              display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '25px', flexWrap: 'wrap'
            }}
          >
            {quote.is_editable && !editMode && (
              <button
                onClick={enterEditMode}
                style={{
                  backgroundColor: 'white', color: '#9b59b6', border: '2px solid #9b59b6',
                  padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', letterSpacing: '1px'
                }}
              >
                ✏️ Edit Quote
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={{
                    backgroundColor: '#16a34a', color: 'white', border: 'none',
                    padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '1px'
                  }}
                >
                  {saving ? 'SAVING...' : '✓ SAVE CHANGES'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  style={{
                    backgroundColor: 'white', color: '#dc2626', border: '2px solid #dc2626',
                    padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', letterSpacing: '1px'
                  }}
                >
                  CANCEL
                </button>
              </>
            )}
            <button
              onClick={handleReQuote}
              style={{
                backgroundColor: 'white', color: '#1d4ed8', border: '2px solid #1d4ed8',
                padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', letterSpacing: '1px'
              }}
            >
              🔄 Re-Quote
            </button>
          </div>

          {/* Edit Mode Inline Fields */}
          {editMode && (
            <div data-print-hide="true" style={{
              backgroundColor: '#faf5ff', border: '2px solid #9b59b6', borderRadius: '10px',
              padding: '20px', marginBottom: '25px'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#9b59b6', fontSize: '13px', fontWeight: '700', textAlign: 'center', letterSpacing: '1px' }}>
                EDITING QUOTE
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>FIRST NAME</label>
                  <input value={editCustomer.first_name || ''} onChange={(e) => setEditCustomer({...editCustomer, first_name: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>LAST NAME</label>
                  <input value={editCustomer.last_name || ''} onChange={(e) => setEditCustomer({...editCustomer, last_name: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>PHONE</label>
                  <input value={editCustomer.phone || ''} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                  <input value={editCustomer.email || ''} onChange={(e) => setEditCustomer({...editCustomer, email: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>QTY</label>
                  <select value={editQuantity} onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '4px' }}>PROMOTION</label>
                  <select value={editPromo} onChange={(e) => setEditPromo(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}>
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
                <label style={{ fontSize: '9px', color: '#666', fontWeight: '600', display: 'block', marginBottom: '8px', textAlign: 'center' }}>TREAD DEPTHS (32nds)</label>
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
                          <input
                            key={pos}
                            value={editTreadDepths[key][pos]}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                              setEditTreadDepths(prev => ({
                                ...prev,
                                [key]: { ...prev[key], [pos]: v }
                              }));
                            }}
                            placeholder={pos[0].toUpperCase()}
                            style={{
                              width: '100%', padding: '4px', border: '1px solid #d1d5db',
                              borderRadius: '4px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontSize: '7px', color: '#999' }}>IN</span>
                        <span style={{ fontSize: '7px', color: '#999' }}>MID</span>
                        <span style={{ fontSize: '7px', color: '#999' }}>OUT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Good / Better / Best Comparison Card */}
          {quote.alternatives && (
            <div className="comparison-card" style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textAlign: 'center' }}>
                COMPARE YOUR OPTIONS
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: quote.alternatives.good && quote.alternatives.best ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                {/* Good Option */}
                {quote.alternatives.good && (
                  <div style={{ 
                    border: '2px solid #86efac', borderRadius: '10px', padding: '15px', textAlign: 'center',
                    backgroundColor: '#f0fdf4'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', letterSpacing: '1px', marginBottom: '8px' }}>GOOD</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                      {quote.alternatives.good.brand}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>{quote.alternatives.good.name}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
                      {formatCurrency(quote.alternatives.good.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '400' }}>/tire</span>
                    </div>
                    {quote.alternatives.good.warranty_miles && (
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {parseInt(quote.alternatives.good.warranty_miles).toLocaleString()} mi warranty
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #bbf7d0',
                      fontSize: '16px', fontWeight: '700', color: '#333'
                    }}>
                      {formatCurrency(quote.alternatives.good.total_installed)}
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>total installed</div>
                  </div>
                )}

                {/* Recommended (Primary Tire) - Always shown */}
                <div style={{ 
                  border: '3px solid #8b1538', borderRadius: '10px', padding: '15px', textAlign: 'center',
                  backgroundColor: '#fdf2f4', position: 'relative'
                }}>
                  <div style={{ 
                    position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#8b1538', color: 'white', padding: '2px 12px', borderRadius: '10px',
                    fontSize: '9px', fontWeight: '700', letterSpacing: '1px'
                  }}>⭐ RECOMMENDED</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '4px', marginTop: '5px' }}>
                    {tire?.brand}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>{tire?.name}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#8b1538', marginBottom: '4px' }}>
                    {formatCurrency(p?.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '400' }}>/tire</span>
                  </div>
                  {tire?.warranty_miles && (
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {parseInt(tire.warranty_miles).toLocaleString()} mi warranty
                    </div>
                  )}
                  <div style={{ 
                    marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f9a8b8',
                    fontSize: '16px', fontWeight: '700', color: '#8b1538'
                  }}>
                    {formatCurrency(p?.total_amount)}
                  </div>
                  <div style={{ fontSize: '9px', color: '#666' }}>total installed</div>
                </div>

                {/* Best Option */}
                {quote.alternatives.best && (
                  <div style={{ 
                    border: '2px solid #fca5a5', borderRadius: '10px', padding: '15px', textAlign: 'center',
                    backgroundColor: '#fef2f2'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#dc2626', letterSpacing: '1px', marginBottom: '8px' }}>BEST</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
                      {quote.alternatives.best.brand}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>{quote.alternatives.best.name}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                      {formatCurrency(quote.alternatives.best.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '400' }}>/tire</span>
                    </div>
                    {quote.alternatives.best.warranty_miles && (
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {parseInt(quote.alternatives.best.warranty_miles).toLocaleString()} mi warranty
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #fecaca',
                      fontSize: '16px', fontWeight: '700', color: '#333'
                    }}>
                      {formatCurrency(quote.alternatives.best.total_installed)}
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>total installed</div>
                  </div>
                )}
              </div>
            </div>
          )}
          {tire?.warranty_miles && (
            <div 
              className="warranty-disclaimer"
              style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              fontSize: '11px',
              color: '#92400e',
              lineHeight: '1.5'
            }}>
              <strong>Tread Wear Warranty Note:</strong> Tire treadwear warranties are not "free replacement" warranties. 
              They are generally prorated discounts based on how early the tires wore out compared to their promised lifespan. 
              Manufacturer's require proof of tire rotations based on the vehicle OEM's schedule and correct vehicle alignment. 
              Road hazards, abuse and neglect are not covered.
            </div>
          )}
          
          </div>{/* End print-column-right */}

          {/* Footer */}
          <div 
            className="quote-footer"
            style={{ 
            textAlign: 'center', 
            borderTop: '1px solid #e2e8f0', 
            paddingTop: '20px',
            color: '#94a3b8',
            fontSize: '12px'
          }}>
            <p style={{ margin: '0 0 5px 0' }}>
              This quote is valid for 7 days. Prices subject to change based on availability.
            </p>
            <p style={{ margin: '0' }}>
              Quote #{quote.quote_number} • {formatDate(quote.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Legal Footer - hidden in print */}
      <div className="no-print" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
        <a href="#/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none', marginRight: '12px' }}>Privacy Policy</a>
        <a href="#/terms" style={{ color: '#94a3b8', textDecoration: 'none', marginRight: '12px' }}>Terms & Conditions</a>
        <a href="#/contact" style={{ color: '#94a3b8', textDecoration: 'none', marginRight: '12px' }}>Contact</a>
        <a href="#/do-not-sell" style={{ color: '#94a3b8', textDecoration: 'none' }}>Do Not Sell My Info</a>
        <p style={{ marginTop: '8px', marginBottom: '0' }}>© 2026 P.C.J.L., Inc. • Jiffy Lube MultiCare • tires.myjiffylube.ai</p>
      </div>

      {/* Print Styles - Landscape 2-Column Layout */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.2in;
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
            font-size: 9px !important;
          }
          
          /* Prevent page breaks inside elements */
          div, table, tr, td, p, h1, h2, h3, h4 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Hide elements marked for print hiding */
          [data-print-hide="true"] { 
            display: none !important; 
          }
          
          /* Hide all buttons and Coming Soon wrappers */
          button { display: none !important; }
          
          /* Remove shadows */
          div { box-shadow: none !important; }
          
          /* Remove link URL printing */
          a[href]:after { content: none !important; }
          
          /* Main container - full width, no overflow */
          .quote-outer-container {
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          
          .quote-main-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
          
          /* Header - very compact */
          .quote-header {
            padding: 6px 10px !important;
            page-break-after: avoid !important;
          }
          
          .quote-header img {
            height: 28px !important;
          }
          
          /* Content area - FORCE 2 columns side by side */
          .quote-content {
            padding: 6px 10px !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 12px !important;
            align-items: flex-start !important;
            width: 100% !important;
            page-break-inside: avoid !important;
          }
          
          /* Left column - FORCE width */
          .print-column-left {
            flex: 0 0 44% !important;
            max-width: 44% !important;
            width: 44% !important;
            overflow: hidden !important;
          }
          
          /* Right column - FORCE width */
          .print-column-right {
            flex: 0 0 54% !important;
            max-width: 54% !important;
            width: 54% !important;
            overflow: hidden !important;
          }
          
          /* Customer/Vehicle - compact */
          .customer-vehicle-row {
            display: block !important;
            margin-bottom: 6px !important;
            padding-bottom: 6px !important;
          }
          
          /* All headings smaller */
          h4 {
            font-size: 8px !important;
            margin: 0 0 4px 0 !important;
          }
          
          h3 {
            font-size: 11px !important;
            margin: 0 !important;
          }
          
          /* All text smaller */
          p, div, span, td, th {
            font-size: 8px !important;
            line-height: 1.2 !important;
          }
          
          /* Pricing table - very compact */
          table {
            font-size: 8px !important;
            width: 100% !important;
          }
          
          table td {
            padding: 2px 0 !important;
          }
          
          /* Warranty disclaimer - tiny */
          .warranty-disclaimer {
            padding: 4px 6px !important;
            font-size: 6px !important;
            line-height: 1.2 !important;
            margin-bottom: 4px !important;
          }
          
          /* Comparison card - very compact for print */
          .comparison-card {
            margin-bottom: 4px !important;
            page-break-inside: avoid !important;
          }
          
          .comparison-card h4 {
            font-size: 7px !important;
            margin-bottom: 4px !important;
          }
          
          .comparison-card > div {
            gap: 4px !important;
          }
          
          .comparison-card [style*="padding"] {
            padding: 4px !important;
          }
          
          .comparison-card [style*="fontSize"] {
            font-size: 7px !important;
          }
          
          /* Footer - compact, prevent page break */
          .quote-footer {
            padding-top: 4px !important;
            font-size: 7px !important;
            border-top: 1px solid #ccc !important;
            page-break-before: avoid !important;
          }
          
          .quote-footer p {
            margin: 1px 0 !important;
          }
          
          /* Force all margins smaller */
          [style*="marginBottom"] {
            margin-bottom: 6px !important;
          }
          
          /* Reduce all padding */
          [style*="padding"] {
            padding: 6px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuoteView;
