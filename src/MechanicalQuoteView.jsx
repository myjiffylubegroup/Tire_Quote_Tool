// =============================================================================
// MECHANICAL QUOTE VIEW
// =============================================================================
// Route: #/mechanical/:code
// Public — customer-facing. Also used by CSA for delivery (print/email/SMS).
// CSAs can add/edit/delete parts and notes via inline edit mode.
// =============================================================================

import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY  = 'TIRES2026';
const JL_LOGO  = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';
const MAROON   = '#8b1538';
const DARK     = '#1e293b';
const SLATE    = '#64748b';
const BORDER   = '#e2e8f0';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPhone = (p) => {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return p;
};

// ─── Print styles ─────────────────────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    @page { size: portrait; margin: 0.25in; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    button { display: none !important; }
    .mq-outer { padding: 0 !important; background: white !important; }
    .mq-card  { max-width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
    .mq-header { padding: 8px 14px !important; }
    .mq-header img { height: 26px !important; }
    .mq-content { padding: 10px 14px !important; }
  }
`;

export default function MechanicalQuoteView({ code }) {
  const [quote,   setQuote]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Edit mode state
  const [editMode,      setEditMode]      = useState(false);
  const [editNotes,     setEditNotes]     = useState('');
  const [savingNote,    setSavingNote]    = useState(false);
  const [partForm,      setPartForm]      = useState({ part_number: '', description: '', quantity: 1, unit_price: '' });
  const [savingPart,    setSavingPart]    = useState(false);
  const [partError,     setPartError]     = useState('');

  // Customer edit state
  const [custForm,      setCustForm]      = useState({ full_name: '', phone: '', email: '', license_plate: '', license_state: 'CA' });
  const [savingCust,    setSavingCust]    = useState(false);
  const [custError,     setCustError]     = useState('');

  // Revision state
  const [revMode,       setRevMode]       = useState(false);
  const [revAuth,       setRevAuth]       = useState('');
  const [revItems,      setRevItems]      = useState([]);  // labor items staged for revision
  const [revParts,      setRevParts]      = useState([]);  // parts staged for revision
  const [revPartForm,   setRevPartForm]   = useState({ part_number: '', description: '', quantity: 1, unit_price: '' });
  const [savingRev,     setSavingRev]     = useState(false);
  const [revError,      setRevError]      = useState('');

  // SMS consent modal
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsPhone,     setSmsPhone]     = useState('');
  const [smsConsent,   setSmsConsent]   = useState(false);
  const [smsSending,   setSmsSending]   = useState(false);
  const [smsSent,      setSmsSent]      = useState(false);
  const [smsError,     setSmsError]     = useState('');

  // Email state
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent,    setEmailSent]    = useState(false);
  const [emailError,   setEmailError]   = useState('');

  // ── Load quote ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) { setError('No quote code provided'); setLoading(false); return; }
    fetch(`${API_BASE}/get-mechanical-quote?short_code=${code}&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setQuote(d.quote);
          setEditNotes(d.quote.notes || '');
          setSmsPhone(formatPhone(d.quote.customer?.phone || ''));
          const cust = d.quote.customer || {};
          setCustForm({
            full_name:     cust.full_name || '',
            phone:         cust.phone || '',
            email:         cust.email || '',
            license_plate: cust.license_plate || '',
            license_state: cust.license_state || 'CA',
          });
        } else {
          setError(d.error || 'Quote not found');
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load quote'); setLoading(false); });
  }, [code]);

  // ── Auth check (is this a staff session?) ──────────────────────────────────
  const isStaff = (() => {
    try { return !!JSON.parse(localStorage.getItem('jl_staff_auth') || '{}').user_id; }
    catch { return false; }
  })();

  // ── Parts management ────────────────────────────────────────────────────────
  const managePart = async (action, payload = {}) => {
    setSavingPart(true); setPartError('');
    try {
      const res  = await fetch(`${API_BASE}/manage-mechanical-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: API_KEY, action, quote_id: quote.quote_id, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setQuote((prev) => ({
          ...prev,
          parts:   data.parts,
          pricing: { ...prev.pricing, ...data.totals },
        }));
        setPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
      } else {
        setPartError(data.error || 'Failed to save part');
      }
    } catch { setPartError('Network error'); }
    setSavingPart(false);
  };

  const handleAddPart = () => {
    if (!partForm.description.trim() || !partForm.unit_price) return;
    managePart('add', {
      part: {
        part_number: partForm.part_number.trim() || undefined,
        description: partForm.description.trim(),
        quantity:    partForm.quantity,
        unit_price:  parseFloat(partForm.unit_price),
      }
    });
  };

  const handleDeletePart = (part_id) => managePart('delete', { part_id });

  // ── Save notes ───────────────────────────────────────────────────────────────
  // ── Save customer info ──────────────────────────────────────────────────────
  const handleSaveCustomer = async () => {
    setSavingCust(true); setCustError('');
    try {
      const res = await fetch(`${API_BASE}/manage-mechanical-quote-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key:      API_KEY,
          quote_id: quote.quote_id,
          customer: {
            full_name:     custForm.full_name.trim(),
            phone:         custForm.phone.replace(/\D/g, ''),
            email:         custForm.email.trim(),
            license_plate: custForm.license_plate.trim().toUpperCase(),
            license_state: custForm.license_state,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuote((prev) => ({
          ...prev,
          customer: {
            ...prev.customer,
            full_name:     custForm.full_name.trim(),
            phone:         custForm.phone.replace(/\D/g, ''),
            email:         custForm.email.trim(),
            license_plate: custForm.license_plate.trim().toUpperCase(),
            license_state: custForm.license_state,
          },
        }));
      } else {
        setCustError(data.error || 'Failed to save customer info');
      }
    } catch { setCustError('Network error'); }
    setSavingCust(false);
  };

  const handleSaveNotes = async () => {
    setSavingNote(true);
    // Notes are stored on mechanical_quotes — update directly via a simple PATCH
    // For now we piggyback on manage-mechanical-parts with a notes-only update
    // by calling get-mechanical-quote after a direct update via supabase REST
    // Simple approach: just update quote.notes optimistically
    setQuote((prev) => ({ ...prev, notes: editNotes }));
    setSavingNote(false);
    setEditMode(false);
  };

  // ── Submit revision ──────────────────────────────────────────────────────────
  const handleSubmitRevision = async () => {
    if (!revAuth.trim() || revAuth.trim().length < 5) { setRevError('Authorization note is required'); return; }
    if (revItems.length === 0 && revParts.length === 0) { setRevError('Add at least one labor item or part'); return; }
    setSavingRev(true); setRevError('');
    try {
      const res = await fetch(`${API_BASE}/add-mechanical-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key:           API_KEY,
          quote_id:      quote.quote_id,
          revision_auth: revAuth.trim(),
          items:         revItems,
          parts:         revParts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Re-fetch full quote to get updated items/parts/totals
        const refreshRes = await fetch(`${API_BASE}/get-mechanical-quote?short_code=${quote.short_code}&key=${API_KEY}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setQuote(refreshData.quote);
        setRevMode(false);
        setRevAuth('');
        setRevItems([]);
        setRevParts([]);
        setRevPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
      } else {
        setRevError(data.error || 'Failed to submit revision');
      }
    } catch { setRevError('Network error'); }
    setSavingRev(false);
  };

  // ── Email ────────────────────────────────────────────────────────────────────
  const handleEmail = async () => {
    if (!quote.customer?.email) return;
    setEmailSending(true); setEmailError('');
    try {
      const res  = await fetch(`${API_BASE}/email-mechanical-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: API_KEY, quote_id: quote.quote_id }),
      });
      const data = await res.json();
      if (data.success) setEmailSent(true);
      else setEmailError(data.error || 'Failed to send email');
    } catch { setEmailError('Network error'); }
    setEmailSending(false);
  };

  // ── SMS ──────────────────────────────────────────────────────────────────────
  const handleSms = async () => {
    const digits = smsPhone.replace(/\D/g, '');
    if (digits.length < 10 || !smsConsent) return;
    setSmsSending(true); setSmsError('');
    try {
      const res  = await fetch(`${API_BASE}/sms-mechanical-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: API_KEY, quote_id: quote.quote_id, phone: digits }),
      });
      const data = await res.json();
      if (data.success) { setSmsSent(true); setShowSmsModal(false); }
      else setSmsError(data.error || 'Failed to send SMS');
    } catch { setSmsError('Network error'); }
    setSmsSending(false);
  };

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', color: SLATE }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>🔧</div>
          Loading quote…
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: 'center', backgroundColor: '#fef2f2', padding: '40px', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>Quote Not Found</h2>
          <p style={{ color: DARK }}>{error}</p>
        </div>
      </div>
    );
  }

  const p  = quote.pricing;
  const c  = quote.customer;
  const v  = quote.vehicle;
  const hasCustomer = c?.full_name || c?.phone || c?.email;
  const isExpired   = quote.is_expired;

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`,
    borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div className="mq-outer" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px' }}>
      <style>{PRINT_STYLES}</style>

      {/* SMS modal */}
      {showSmsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: DARK }}>Text Quote</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>MOBILE NUMBER</label>
              <input type="tel" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="(805) 555-1234" style={{ ...inputStyle, fontSize: '15px', textAlign: 'center', letterSpacing: '1px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-start' }}>
              <input type="checkbox" id="sms-consent" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }} />
              <label htmlFor="sms-consent" style={{ fontSize: '11px', color: SLATE, lineHeight: '1.5', cursor: 'pointer' }}>
                Customer consents to receive this quote and service messages via SMS. Msg & data rates may apply. Reply STOP to opt out.
              </label>
            </div>
            {smsError && <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '10px' }}>{smsError}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowSmsModal(false)} style={{ flex: 1, padding: '10px', border: `1px solid ${BORDER}`, borderRadius: '25px', background: 'white', fontSize: '13px', cursor: 'pointer', color: SLATE, fontWeight: '600' }}>Cancel</button>
              <button onClick={handleSms} disabled={smsSending || !smsConsent || smsPhone.replace(/\D/g,'').length < 10}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '25px', background: !smsConsent || smsPhone.replace(/\D/g,'').length < 10 ? '#ccc' : MAROON, color: 'white', fontSize: '13px', cursor: !smsConsent ? 'not-allowed' : 'pointer', fontWeight: '700' }}>
                {smsSending ? 'Sending…' : 'Send Text'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mq-card" style={{ maxWidth: '820px', margin: '0 auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div className="mq-header" style={{ borderTop: `5px solid ${MAROON}`, backgroundColor: 'white', padding: '18px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: `1px solid ${BORDER}` }}>
          <img src={JL_LOGO} alt="Jiffy Lube Multicare" style={{ height: '42px' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: SLATE, letterSpacing: '1px' }}>MECHANICAL LABOR QUOTE</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: DARK }}>{quote.quote_number}</div>
            <div style={{ fontSize: '11px', color: SLATE }}>
              {isExpired
                ? <span style={{ color: '#dc2626', fontWeight: '700' }}>EXPIRED</span>
                : <>Valid through {formatDate(quote.expires_at)}</>
              }
            </div>
          </div>
        </div>

        {/* ── Action buttons (staff only, no print) ── */}
        {isStaff && (
          <div className="no-print" style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${BORDER}`, padding: '12px 28px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => window.print()} style={actionBtn('#475569')}>🖨️<br/>Print</button>
            <button onClick={handleEmail} disabled={emailSending || !c?.email}
              style={actionBtn(emailSent ? '#16a34a' : c?.email ? '#2563eb' : '#ccc')}>
              {emailSent ? '✓' : '✉️'}<br/>{emailSending ? 'Sending…' : emailSent ? 'Sent' : 'Email'}
            </button>
            <button onClick={() => setShowSmsModal(true)} style={actionBtn(smsSent ? '#16a34a' : '#7c3aed')}>
              {smsSent ? '✓' : '💬'}<br/>{smsSent ? 'Sent' : 'Text'}
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setEditMode(!editMode); setRevMode(false); }} style={{
                padding: '8px 16px', border: `2px solid ${editMode ? MAROON : BORDER}`,
                borderRadius: '20px', backgroundColor: editMode ? '#fff5f5' : 'white',
                color: editMode ? MAROON : SLATE, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              }}>
                {editMode ? '✓ Done Editing' : '✏️ Edit Customer & Parts'}
              </button>
              {quote.status === 'presented' && !editMode && (
                <button onClick={() => { setRevMode(!revMode); setEditMode(false); }} style={{
                  padding: '8px 16px', border: `2px solid ${revMode ? '#d97706' : BORDER}`,
                  borderRadius: '20px', backgroundColor: revMode ? '#fffbeb' : 'white',
                  color: revMode ? '#d97706' : SLATE, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                }}>
                  {revMode ? '✓ Cancel Revision' : '⚠️ Add Revision'}
                </button>
              )}
            </div>
          </div>
        )}

        {emailError && <div className="no-print" style={{ backgroundColor: '#fef2f2', padding: '8px 28px', fontSize: '12px', color: '#dc2626' }}>{emailError}</div>}

        <div className="mq-content" style={{ padding: '28px' }}>

          {/* ── Store + Customer + Vehicle ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px', marginBottom: '28px', paddingBottom: '24px', borderBottom: `1px solid ${BORDER}` }}>

            {/* Store */}
            <div>
              <div style={sectionLabel}>SERVICE LOCATION</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: DARK }}>{quote.store?.store_name}</div>
              {quote.created_by?.username && (
                <div style={{ fontSize: '13px', color: SLATE, marginTop: '4px' }}>Prepared by {quote.created_by.username}</div>
              )}
              <div style={{ fontSize: '12px', color: SLATE, marginTop: '2px' }}>{formatDate(quote.created_at)}</div>
            </div>

            {/* Customer */}
            {hasCustomer && (
              <div>
                <div style={sectionLabel}>PREPARED FOR</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: DARK }}>{c.full_name || 'Valued Customer'}</div>
                {c.phone && <div style={{ fontSize: '13px', color: SLATE, marginTop: '3px' }}>📞 {c.phone_formatted || formatPhone(c.phone)}</div>}
                {c.email && <div style={{ fontSize: '13px', color: SLATE }}>{c.email}</div>}
                {c.license_plate && (
                  <div style={{ display: 'inline-block', marginTop: '6px', backgroundColor: '#f0f0f0', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', color: '#555' }}>
                    {c.license_state} {c.license_plate}
                  </div>
                )}
              </div>
            )}

            {/* Vehicle */}
            <div>
              <div style={sectionLabel}>VEHICLE</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: DARK }}>{v?.display || 'Vehicle'}</div>
              {quote.vehicle?.config && (
                <div style={{ fontSize: '12px', color: SLATE, marginTop: '3px' }}>
                  {quote.vehicle.config.engine_liter}L · {quote.vehicle.config.fuel_type_name || 'GAS'} · {quote.vehicle.config.drive_type_name}
                </div>
              )}
            </div>
          </div>

          {/* ── Labor Items ── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={sectionLabel}>LABOR SERVICES</div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px', backgroundColor: '#f8fafc', padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                {['SERVICE', 'HRS', 'QTY', 'LABOR'].map((h) => (
                  <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', textAlign: h === 'SERVICE' ? 'left' : 'right' }}>{h}</div>
                ))}
              </div>
              {(quote.items || []).map((item, i) => (
                <div key={item.item_id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px',
                  padding: '12px 14px', borderBottom: i < quote.items.length - 1 ? `1px solid ${BORDER}` : 'none',
                  backgroundColor: i % 2 === 0 ? 'white' : '#fafafa',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: DARK, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {item.motor_db_operation}
                      {item.qualifier_description && <span style={{ color: SLATE, fontWeight: '400' }}> · {item.qualifier_description}</span>}
                      {item.is_revision && (
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}>ADDED</span>
                      )}
                    </div>
                    {item.motor_db_description && (
                      <div style={{ fontSize: '11px', color: SLATE, marginTop: '1px' }}>{item.motor_db_description}</div>
                    )}
                    {item.is_revision && item.revision_auth && (
                      <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px', fontStyle: 'italic' }}>Auth: {item.revision_auth}</div>
                    )}
                    {item.motor_db_footnote && (
                      <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>ℹ️ {item.motor_db_footnote}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: SLATE, textAlign: 'right', paddingTop: '1px' }}>{item.motor_time}h</div>
                  <div style={{ fontSize: '13px', color: SLATE, textAlign: 'right', paddingTop: '1px' }}>{item.quantity}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: DARK, textAlign: 'right', paddingTop: '1px' }}>
                    {formatCurrency(parseFloat(item.labor_price) * (item.quantity || 1))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Customer edit (edit mode only) ── */}
          {editMode && (
            <div style={{ marginBottom: '24px' }}>
              <div style={sectionLabel}>CUSTOMER INFORMATION</div>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                    <input type="text" value={custForm.full_name} placeholder="Customer name"
                      onChange={(e) => setCustForm((p) => ({ ...p, full_name: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>PHONE</label>
                    <input type="tel" value={custForm.phone} placeholder="8055551234"
                      onChange={(e) => setCustForm((p) => ({ ...p, phone: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                    <input type="email" value={custForm.email} placeholder="customer@email.com"
                      onChange={(e) => setCustForm((p) => ({ ...p, email: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: '60px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>STATE</label>
                      <input type="text" value={custForm.license_state} maxLength={2}
                        onChange={(e) => setCustForm((p) => ({ ...p, license_state: e.target.value.toUpperCase() }))}
                        style={{ ...inputStyle, textAlign: 'center', textTransform: 'uppercase' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>PLATE</label>
                      <input type="text" value={custForm.license_plate} placeholder="8ABC123"
                        onChange={(e) => setCustForm((p) => ({ ...p, license_plate: e.target.value.toUpperCase() }))}
                        style={{ ...inputStyle, textTransform: 'uppercase' }} />
                    </div>
                  </div>
                </div>
                {custError && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px' }}>{custError}</div>}
                <button onClick={handleSaveCustomer} disabled={savingCust}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: '20px', backgroundColor: MAROON, color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {savingCust ? 'Saving…' : 'Save Customer Info'}
                </button>
              </div>
            </div>
          )}

          {/* ── Parts ── */}
          {((quote.parts || []).length > 0 || editMode) && (
            <div style={{ marginBottom: '24px' }}>
              <div style={sectionLabel}>PARTS</div>
              {(quote.parts || []).length > 0 && (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', overflow: 'hidden', marginBottom: editMode ? '12px' : '0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px 80px 90px', backgroundColor: '#f8fafc', padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                    {['PART #', 'DESCRIPTION', 'QTY', 'UNIT', 'TOTAL'].map((h) => (
                      <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', textAlign: h === 'PART #' || h === 'DESCRIPTION' ? 'left' : 'right' }}>{h}</div>
                    ))}
                  </div>
                  {(quote.parts || []).map((part, i) => (
                    <div key={part.part_id} style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 50px 80px 90px',
                      padding: '10px 14px', borderBottom: i < quote.parts.length - 1 ? `1px solid ${BORDER}` : 'none',
                      backgroundColor: i % 2 === 0 ? 'white' : '#fafafa', alignItems: 'center',
                    }}>
                      <div style={{ fontSize: '11px', color: SLATE, fontFamily: 'monospace' }}>{part.part_number || '—'}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: DARK, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {part.description}
                        {part.is_revision && <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}>ADDED</span>}
                      </div>
                      {part.is_revision && part.revision_auth && (
                        <div style={{ fontSize: '10px', color: '#92400e', fontStyle: 'italic' }}>Auth: {part.revision_auth}</div>
                      )}
                      <div style={{ fontSize: '13px', color: SLATE, textAlign: 'right' }}>{part.quantity}</div>
                      <div style={{ fontSize: '13px', color: SLATE, textAlign: 'right' }}>{formatCurrency(part.unit_price)}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: DARK, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {formatCurrency(part.line_total)}
                        {editMode && (
                          <button onClick={() => handleDeletePart(part.part_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add part form (edit mode only) */}
              {editMode && (
                <div style={{ border: `1px dashed ${BORDER}`, borderRadius: '8px', padding: '14px', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '10px' }}>ADD PART</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px 90px auto', gap: '8px', alignItems: 'end' }}>
                    <input type="text" placeholder="Part #" value={partForm.part_number}
                      onChange={(e) => setPartForm((p) => ({ ...p, part_number: e.target.value }))}
                      style={inputStyle} />
                    <input type="text" placeholder="Description *" value={partForm.description}
                      onChange={(e) => setPartForm((p) => ({ ...p, description: e.target.value }))}
                      style={inputStyle} />
                    <input type="number" placeholder="Qty" min="1" value={partForm.quantity}
                      onChange={(e) => setPartForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      style={{ ...inputStyle, textAlign: 'center' }} />
                    <input type="number" placeholder="Unit Price *" min="0" step="0.01" value={partForm.unit_price}
                      onChange={(e) => setPartForm((p) => ({ ...p, unit_price: e.target.value }))}
                      style={inputStyle} />
                    <button onClick={handleAddPart} disabled={savingPart || !partForm.description.trim() || !partForm.unit_price}
                      style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: !partForm.description.trim() || !partForm.unit_price ? '#ccc' : MAROON, color: 'white', fontSize: '12px', fontWeight: '700', cursor: !partForm.description.trim() || !partForm.unit_price ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                      {savingPart ? '…' : '+ Add'}
                    </button>
                  </div>
                  {partError && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '6px' }}>{partError}</div>}
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {(quote.notes || editMode) && (
            <div style={{ marginBottom: '24px' }}>
              <div style={sectionLabel}>NOTES</div>
              {editMode ? (
                <div>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
                    placeholder="Add notes for the customer…" />
                  <button onClick={handleSaveNotes} disabled={savingNote}
                    style={{ marginTop: '6px', padding: '6px 16px', border: 'none', borderRadius: '20px', backgroundColor: MAROON, color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {savingNote ? 'Saving…' : 'Save Note'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: DARK, lineHeight: '1.6', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px' }}>
                  {quote.notes}
                </div>
              )}
            </div>
          )}

          {/* ── Revision panel (presented quotes, staff only) ── */}
          {revMode && isStaff && (
            <div style={{ marginBottom: '24px', border: '2px solid #f59e0b', borderRadius: '8px', padding: '16px', backgroundColor: '#fffbeb' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', letterSpacing: '1px', marginBottom: '12px' }}>⚠️ ADD REVISED ITEMS</div>
              <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '12px', lineHeight: '1.5' }}>
                Items added here will appear on the quote as <strong>ADDED</strong> with your authorization note. This satisfies California BAR requirements for revised estimates.
              </p>

              {/* Staged revision items */}
              {revItems.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>STAGED LABOR</div>
                  {revItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'white', borderRadius: '6px', marginBottom: '4px', border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: DARK }}>{item.motor_db_operation} {item.qualifier_description ? `· ${item.qualifier_description}` : ''}</div>
                        <div style={{ fontSize: '11px', color: SLATE }}>{item.motor_time}h × ${parseFloat(item.labor_price).toFixed(2)} × qty {item.quantity}</div>
                      </div>
                      <button onClick={() => setRevItems(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {revParts.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>STAGED PARTS</div>
                  {revParts.map((part, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'white', borderRadius: '6px', marginBottom: '4px', border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: DARK }}>{part.description}</div>
                        <div style={{ fontSize: '11px', color: SLATE }}>{part.quantity} × {formatCurrency(part.unit_price)}</div>
                      </div>
                      <button onClick={() => setRevParts(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add labor to revision — navigates to MechanicalFinder in revision mode */}
              <div style={{ marginBottom: '10px' }}>
                <button onClick={() => {
                  // Store revision context for MechanicalFinder to pick up
                  sessionStorage.setItem('jl_revision_context', JSON.stringify({
                    quote_id:        quote.quote_id,
                    short_code:      quote.short_code,
                    base_vehicle_id: quote.vehicle?.base_vehicle_id,
                    engine_config_id: quote.vehicle?.config?.engine_config_id,
                    vehicle_display: quote.vehicle?.display,
                    config_label:    quote.vehicle?.config
                      ? `${quote.vehicle.config.engine_liter}L · ${quote.vehicle.config.fuel_type_name || 'GAS'} · ${quote.vehicle.config.drive_type_name}`
                      : '',
                  }));
                  window.location.hash = '#/mechanical?mode=revision';
                }} style={{
                  width: '100%', padding: '10px', border: '2px dashed #92400e',
                  borderRadius: '8px', backgroundColor: 'white', color: '#92400e',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center',
                }}>
                  🔧 Add Labor Services to Revision
                </button>
                <div style={{ fontSize: '10px', color: '#92400e', textAlign: 'center', marginTop: '4px' }}>
                  Opens service browser with vehicle pre-loaded
                </div>
              </div>

              {/* Add revised part form */}
              <div style={{ backgroundColor: 'white', borderRadius: '6px', padding: '10px', border: `1px solid ${BORDER}`, marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '8px' }}>ADD PART TO REVISION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px 90px auto', gap: '6px', alignItems: 'end' }}>
                  <input type="text" placeholder="Part #" value={revPartForm.part_number}
                    onChange={(e) => setRevPartForm(p => ({ ...p, part_number: e.target.value }))}
                    style={inputStyle} />
                  <input type="text" placeholder="Description *" value={revPartForm.description}
                    onChange={(e) => setRevPartForm(p => ({ ...p, description: e.target.value }))}
                    style={inputStyle} />
                  <input type="number" placeholder="Qty" min="1" value={revPartForm.quantity}
                    onChange={(e) => setRevPartForm(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    style={{ ...inputStyle, textAlign: 'center' }} />
                  <input type="number" placeholder="Price *" min="0" step="0.01" value={revPartForm.unit_price}
                    onChange={(e) => setRevPartForm(p => ({ ...p, unit_price: e.target.value }))}
                    style={inputStyle} />
                  <button onClick={() => {
                    if (!revPartForm.description.trim() || !revPartForm.unit_price) return;
                    setRevParts(prev => [...prev, { part_number: revPartForm.part_number.trim() || null, description: revPartForm.description.trim(), quantity: revPartForm.quantity, unit_price: parseFloat(revPartForm.unit_price) }]);
                    setRevPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
                  }} disabled={!revPartForm.description.trim() || !revPartForm.unit_price}
                    style={{ padding: '8px 12px', border: 'none', borderRadius: '6px', backgroundColor: !revPartForm.description.trim() || !revPartForm.unit_price ? '#ccc' : '#92400e', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Part
                  </button>
                </div>
              </div>

              {/* Authorization note */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>AUTHORIZATION NOTE * (required)</label>
                <input type="text" value={revAuth} onChange={(e) => setRevAuth(e.target.value)}
                  placeholder='e.g. "Authorized by customer via phone at 2:15pm"'
                  style={{ ...inputStyle, borderColor: '#f59e0b' }} />
                <div style={{ fontSize: '10px', color: '#92400e', marginTop: '4px' }}>This note will appear on the customer quote and satisfies CA BAR revised estimate requirements.</div>
              </div>

              {revError && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px' }}>{revError}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSubmitRevision} disabled={savingRev || (!revAuth.trim()) || (revItems.length === 0 && revParts.length === 0)}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: '20px', backgroundColor: !revAuth.trim() || (revItems.length === 0 && revParts.length === 0) ? '#ccc' : '#92400e', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {savingRev ? 'Saving…' : 'Authorize & Submit Revision'}
                </button>
                <button onClick={() => { setRevMode(false); setRevItems([]); setRevParts([]); setRevAuth(''); setRevError(''); }}
                  style={{ padding: '10px 20px', border: `1px solid ${BORDER}`, borderRadius: '20px', backgroundColor: 'white', color: SLATE, fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Pricing summary ── */}
          {(() => {
            const allItems = quote.items || [];
            const allParts = quote.parts || [];
            const origLabor = allItems.filter(i => !i.is_revision).reduce((s, i) => s + parseFloat(i.labor_price) * (i.quantity || 1), 0);
            const revLabor  = allItems.filter(i => i.is_revision).reduce((s, i) => s + parseFloat(i.labor_price) * (i.quantity || 1), 0);
            const origParts = allParts.filter(pt => !pt.is_revision).reduce((s, pt) => s + parseFloat(pt.line_total), 0);
            const revParts2 = allParts.filter(pt => pt.is_revision).reduce((s, pt) => s + parseFloat(pt.line_total), 0);
            const hasRevision = revLabor > 0 || revParts2 > 0;
            return (
            <div style={{ backgroundColor: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '16px 20px', marginBottom: '24px' }}>
              <div style={sectionLabel}>PRICING SUMMARY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px', marginLeft: 'auto' }}>
                {hasRevision ? (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '2px' }}>ORIGINAL ESTIMATE</div>
                    {origLabor > 0 && <PricingRow label="Labor" value={formatCurrency(origLabor)} sub />}
                    {origParts > 0 && <PricingRow label="Parts" value={formatCurrency(origParts)} sub />}
                    <div style={{ borderTop: `1px dashed ${BORDER}`, paddingTop: '6px', marginTop: '2px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', letterSpacing: '1px', marginBottom: '4px' }}>REVISED ADDITION</div>
                      {revLabor > 0 && <PricingRow label="Labor (added)" value={formatCurrency(revLabor)} sub />}
                      {revParts2 > 0 && <PricingRow label="Parts (added)" value={formatCurrency(revParts2)} sub />}
                    </div>
                    {p.tax_amount > 0 && <PricingRow label={`Tax (${(p.tax_rate * 100).toFixed(2)}%) on parts`} value={formatCurrency(p.tax_amount)} sub />}
                    <div style={{ borderTop: `2px solid ${BORDER}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: DARK }}>REVISED TOTAL</span>
                      <span style={{ fontSize: '22px', fontWeight: '700', color: MAROON }}>{formatCurrency(p.total)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <PricingRow label="Labor" value={formatCurrency(p.subtotal_labor)} />
                    {p.subtotal_parts > 0 && <PricingRow label="Parts" value={formatCurrency(p.subtotal_parts)} />}
                    {p.tax_amount > 0 && <PricingRow label={`Tax (${(p.tax_rate * 100).toFixed(2)}%) on parts`} value={formatCurrency(p.tax_amount)} sub />}
                    <div style={{ borderTop: `2px solid ${BORDER}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: DARK }}>TOTAL ESTIMATE</span>
                      <span style={{ fontSize: '22px', fontWeight: '700', color: MAROON }}>{formatCurrency(p.total)}</span>
                    </div>
                  </>
                )}
                <div style={{ fontSize: '10px', color: SLATE, textAlign: 'right', marginTop: '-4px' }}>Labor not taxed · Parts taxed at {(p.tax_rate * 100).toFixed(2)}%</div>
              </div>
            </div>
            );
          })()}

          {/* ── Footer disclaimer ── */}
          <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.6', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
            <strong style={{ color: SLATE }}>IMPORTANT:</strong> This is an estimate for labor and parts based on the described services.
            Final charges may vary based on actual parts used and additional labor discovered during service.
            Labor rates are based on MOTOR published estimated work times.
            This estimate is valid through {formatDate(quote.expires_at)}.
            Parts are estimated and subject to availability and current pricing.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sectionLabel = {
  fontSize: '10px', fontWeight: '700', color: '#64748b',
  letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px',
};

const PricingRow = ({ label, value, sub }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ fontSize: sub ? '12px' : '13px', color: sub ? '#64748b' : '#1e293b' }}>{label}</span>
    <span style={{ fontSize: sub ? '12px' : '13px', fontWeight: sub ? '400' : '600', color: sub ? '#64748b' : '#1e293b' }}>{value}</span>
  </div>
);

const actionBtn = (color) => ({
  padding: '8px 16px', border: 'none', borderRadius: '8px',
  backgroundColor: color, color: 'white', fontSize: '11px', fontWeight: '700',
  cursor: color === '#ccc' ? 'not-allowed' : 'pointer', textAlign: 'center',
  lineHeight: '1.4', minWidth: '60px',
});
