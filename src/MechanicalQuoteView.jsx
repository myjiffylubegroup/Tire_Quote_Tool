// =============================================================================
// MECHANICAL QUOTE VIEW
// =============================================================================
// Route: #/mechanical/:code
// Public — customer-facing. Also used by CSA for delivery (print/email/SMS).
// CSAs can add/edit/delete parts and notes via inline edit mode.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';

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
    @page { size: portrait; margin: 0.5in; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .print-only { display: grid !important; }
    button { display: none !important; }
    .mq-outer { padding: 0 !important; background: white !important; }
    .mq-card  { max-width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
    .mq-header { padding: 8px 14px !important; }
    .mq-header img { height: 26px !important; }
    .mq-content { padding: 10px 14px !important; }
  }
  .print-only { display: none; }
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
  const [revMode,          setRevMode]          = useState(false);
  const [revAuth,          setRevAuth]          = useState('');
  const [revItems,         setRevItems]         = useState([]);
  const [revParts,         setRevParts]         = useState([]);
  const [revRemoveItems,   setRevRemoveItems]   = useState([]);  // item_ids staged to REMOVE
  const [revRemoveParts,   setRevRemoveParts]   = useState([]);  // part_ids staged to REMOVE
  const [revUpdateParts,   setRevUpdateParts]   = useState([]);  // { part_id, quantity } staged to UPDATE
  const [revPartForm,      setRevPartForm]      = useState({ part_number: '', description: '', quantity: 1, unit_price: '' });
  // Manual labor form for revision mode — mirrors MechanicalFinder. On Add,
  // pushes a manual item into revItems with is_manual=true.
  const [revManualLaborForm, setRevManualLaborForm] = useState({ description: '', hours: '0.50' });
  const [revPtLoading,     setRevPtLoading]     = useState(false);
  const [revPtPolling,     setRevPtPolling]     = useState(false);
  const [revPtSessionId,   setRevPtSessionId]   = useState(null);
  const [revPtError,       setRevPtError]       = useState('');
  const revPtIntervalRef   = useRef(null);
  const [savingRev,        setSavingRev]        = useState(false);
  const [revError,         setRevError]         = useState('');

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

  // PartsTech order state
  const [ordering,     setOrdering]     = useState(false);
  const [orderError,   setOrderError]   = useState('');
  const [orderResult,  setOrderResult]  = useState(null);
  const [unavailParts, setUnavailParts] = useState([]);

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
          // Mark as presented when staff opens the quote view —
          // viewing = presenting. Only update if still draft.
          if (d.quote.status === 'draft') {
            const staffAuth = (() => { try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; } })();
            if (staffAuth.user_id) {
              fetch(`${API_BASE}/present-mechanical-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: API_KEY, quote_id: d.quote.quote_id }),
              }).catch(() => {});
              setQuote(prev => ({ ...prev, status: 'presented', presented_at: new Date().toISOString() }));
            }
          }
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

  // handleDeletePart replaced by handleRemovePart below which handles both
  // manual parts and PartsTech parts (syncs removal back to PT cart).

  const handleRemovePart = async (part) => {
    setSavingPart(true); setPartError('');
    try {
      const res  = await fetch(`${API_BASE}/partstech-remove-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key:                     API_KEY,
          quote_id:                quote.quote_id,
          store_id:                quote.store?.store_id,
          part_id:                 part.part_id,
          partstech_order_item_id: part.partstech_order_item_id || null,
          partstech_session_id:    part.partstech_session_id    || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuote((prev) => ({
          ...prev,
          parts:   data.parts,
          pricing: { ...prev.pricing, ...data.totals },
        }));
      } else {
        setPartError(data.error || 'Failed to remove part');
      }
    } catch { setPartError('Network error'); }
    setSavingPart(false);
  };

  const handleUpdatePartQty = async (part, newQty) => {
    const qty = Math.max(1, Math.min(99, newQty));
    if (part.source === 'partstech' && part.partstech_order_item_id) {
      // PartsTech part — sync back to PT cart, then update DB
      setSavingPart(true); setPartError('');
      try {
        // Collect all PartsTech parts for this session so PT doesn't drop any
        const allSessionParts = (quote.parts || [])
          .filter((p) => p.source === 'partstech' && p.partstech_session_id === part.partstech_session_id)
          .map((p) => ({
            partstech_order_item_id: p.partstech_order_item_id,
            partstech_session_id:    p.partstech_session_id,
            quantity:                p.part_id === part.part_id ? qty : p.quantity,
          }));

        const res  = await fetch(`${API_BASE}/partstech-update-cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key:                     API_KEY,
            quote_id:                quote.quote_id,
            store_id:                quote.store?.store_id,
            part_id:                 part.part_id,
            partstech_order_item_id: part.partstech_order_item_id,
            new_quantity:            qty,
            all_session_parts:       allSessionParts,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setQuote((prev) => ({
            ...prev,
            parts:   data.parts,
            pricing: { ...prev.pricing, ...data.totals },
          }));
        } else {
          setPartError(data.error || 'Failed to update quantity');
        }
      } catch { setPartError('Network error'); }
      setSavingPart(false);
    } else {
      // Manual part — use existing manage-mechanical-parts
      managePart('update', { part_id: part.part_id, part: { quantity: qty } });
    }
  };

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
    const hasChanges = revItems.length > 0 || revParts.length > 0 || revRemoveItems.length > 0 || revRemoveParts.length > 0 || revUpdateParts.length > 0;
    if (!hasChanges) { setRevError('Add, remove, or update at least one item'); return; }
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
          remove_items:  revRemoveItems,
          remove_parts:  revRemoveParts,
          update_parts:  revUpdateParts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const refreshRes = await fetch(`${API_BASE}/get-mechanical-quote?short_code=${quote.short_code}&key=${API_KEY}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setQuote(refreshData.quote);
        setRevMode(false);
        setRevAuth('');
        setRevItems([]);
        setRevParts([]);
        setRevRemoveItems([]);
        setRevRemoveParts([]);
        setRevUpdateParts([]);
        setRevPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
        setRevManualLaborForm({ description: '', hours: '0.50' });
        setRevPtSessionId(null);
        setRevPtPolling(false);
        setRevPtError('');
      } else {
        setRevError(data.error || 'Failed to submit revision');
      }
    } catch { setRevError('Network error'); }
    setSavingRev(false);
  };

  // ── PartsTech punchout for revision ──────────────────────────────────────────
  const handleRevPunchout = async () => {
    setRevPtLoading(true); setRevPtError('');
    try {
      // Vehicle identification — VIN preferred, plate fallback, then year/make/model
      const vin   = quote.customer?.vin;
      const plate = quote.customer?.license_plate;
      const plateState = quote.customer?.license_state;

      const vehiclePayload = {
        year:     quote.vehicle?.year,
        make:     quote.vehicle?.make,
        model:    quote.vehicle?.model,
        submodel: quote.vehicle?.submodel,
      };
      if (vin) {
        vehiclePayload.vin = vin;
      } else if (plate && plateState) {
        vehiclePayload.plate      = plate;
        vehiclePayload.plateState = plateState;
      }

      const res = await fetch(`${API_BASE}/partstech-punchout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key:       API_KEY,
          store_id:  quote.store?.store_id,
          vehicle:   vehiclePayload,
          po_number: vin || plate || quote.quote_number,
        }),
      });
      const data = await res.json();
      if (!data.success) { setRevPtError(data.error || 'Failed to open PartsTech'); setRevPtLoading(false); return; }

      window.open(data.redirect_url, '_blank');
      const ptMessageHandler = (event) => {
        if (event.origin !== 'https://app.partstech.com') return;
      };
      window.addEventListener('message', ptMessageHandler);
      setRevPtSessionId(data.session_id);
      setRevPtPolling(true);

      // Store interval in ref so cancel can clear it reliably
      if (revPtIntervalRef.current) clearInterval(revPtIntervalRef.current);
      revPtIntervalRef.current = setInterval(async () => {
        try {
          const pollRes  = await fetch(`${API_BASE}/partstech-poll-session?session_id=${data.session_id}&key=${API_KEY}`);
          const pollData = await pollRes.json();
          if (pollData.ready) {
            clearInterval(revPtIntervalRef.current);
            revPtIntervalRef.current = null;
            setRevPtPolling(false);
            setRevPtSessionId(null);
            window.removeEventListener('message', ptMessageHandler);
            if (pollData.parts && pollData.parts.length > 0) {
              setRevParts(prev => [...prev, ...pollData.parts]);
            }
          } else if (!pollData.success) {
            clearInterval(revPtIntervalRef.current);
            revPtIntervalRef.current = null;
            setRevPtPolling(false);
            setRevPtError(pollData.error || 'PartsTech session error');
          }
        } catch { /* keep polling on transient errors */ }
      }, 2000);
    } catch { setRevPtError('Network error'); }
    setRevPtLoading(false);
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

  // ── Place PartsTech order ─────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setOrdering(true); setOrderError(""); setUnavailParts([]);
    try {
      const res  = await fetch(`${API_BASE}/partstech-place-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: API_KEY, quote_id: quote.quote_id, store_id: quote.store?.store_id }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderResult({ ordered_at: data.ordered_at, order_ids: data.order_ids, part_count: data.part_count });
        setQuote((prev) => ({ ...prev, partstech_ordered_at: data.ordered_at, partstech_order_ids: data.order_ids }));
      } else if (data.unavailable) {
        setUnavailParts(data.unavailable_parts || []);
        setOrderError(data.error || "Some parts are unavailable");
      } else {
        setOrderError(data.error || "Order failed — please try again");
      }
    } catch { setOrderError("Network error — please try again"); }
    setOrdering(false);
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
        <div className="mq-header" style={{ borderTop: `5px solid ${MAROON}`, backgroundColor: 'white', padding: '18px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <img src={JL_LOGO} alt="Jiffy Lube Multicare" style={{ height: '42px', display: 'block', marginBottom: '4px' }} />
            {/* Store details — shown on print only */}
            <div className="print-only" style={{ fontSize: '11px', color: DARK, lineHeight: '1.6', marginTop: '6px' }}>
              <div style={{ fontWeight: '700' }}>{quote.store?.store_name}</div>
              <div>P.C.J.L., Inc.</div>
              {quote.store?.address && <div>{quote.store.address}</div>}
              {quote.store?.city && <div>{quote.store.city}, {quote.store.state} {quote.store.zip}</div>}
              {quote.store?.phone && <div>{formatPhone(quote.store.phone)}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: SLATE, letterSpacing: '1px' }}>MECHANICAL LABOR QUOTE</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: DARK }}>{quote.quote_number}</div>
            <div style={{ fontSize: '11px', color: SLATE }}>
              {isExpired
                ? <span style={{ color: '#dc2626', fontWeight: '700' }}>EXPIRED</span>
                : <>Valid through {formatDate(quote.expires_at)}</>
              }
            </div>
            <div style={{ fontSize: '11px', color: SLATE, marginTop: '2px' }}>{formatDate(quote.created_at)}</div>
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
            {/* Order Parts — visible when quote has PartsTech parts and not yet ordered */}
            {(quote.parts || []).some((p) => p.source === 'partstech') && !quote.partstech_ordered_at && (
              <button onClick={handlePlaceOrder} disabled={ordering}
                style={actionBtn(ordering ? '#ccc' : '#0369a1')}>
                {ordering ? '⏳' : '📦'}<br/>{ordering ? 'Checking…' : 'Order Parts'}
              </button>
            )}
            {/* Already ordered indicator */}
            {quote.partstech_ordered_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '6px 12px' }}>
                <span style={{ fontSize: '14px' }}>✅</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>Parts Ordered</div>
                  <div style={{ fontSize: '10px', color: '#16a34a' }}>{new Date(quote.partstech_ordered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setEditMode(!editMode); setRevMode(false); }} style={{
                padding: '8px 16px', border: `2px solid ${editMode ? MAROON : BORDER}`,
                borderRadius: '20px', backgroundColor: editMode ? '#fff5f5' : 'white',
                color: editMode ? MAROON : SLATE, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              }}>
                {editMode ? '✓ Done Editing' : '✏️ Edit Customer'}
              </button>
              {quote.status === 'presented' && !editMode && (
                <button onClick={() => { const next = !revMode; setRevMode(next); setEditMode(false); if (!next) { if (revPtIntervalRef.current) { clearInterval(revPtIntervalRef.current); revPtIntervalRef.current = null; } setRevItems([]); setRevParts([]); setRevRemoveItems([]); setRevRemoveParts([]); setRevUpdateParts([]); setRevAuth(''); setRevError(''); setRevManualLaborForm({ description: '', hours: '0.50' }); setRevPtSessionId(null); setRevPtPolling(false); }}} style={{
                  padding: '8px 16px', border: `2px solid ${revMode ? '#d97706' : BORDER}`,
                  borderRadius: '20px', backgroundColor: revMode ? '#fffbeb' : 'white',
                  color: revMode ? '#d97706' : SLATE, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                }}>
                  {revMode ? '✓ Cancel Revision' : '✏️ Revise Quote'}
                </button>
              )}
            </div>
          </div>
        )}

        {emailError && <div className="no-print" style={{ backgroundColor: '#fef2f2', padding: '8px 28px', fontSize: '12px', color: '#dc2626' }}>{emailError}</div>}

        {/* Order error / unavailability banner */}
        {orderError && (
          <div className="no-print" style={{ backgroundColor: '#fef2f2', borderBottom: `1px solid #fecaca`, padding: '12px 28px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', marginBottom: unavailParts.length > 0 ? '6px' : '0' }}>{orderError}</div>
            {unavailParts.length > 0 && (
              <div style={{ fontSize: '11px', color: '#dc2626' }}>
                Unavailable: {unavailParts.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Order confirmation banner */}
        {(orderResult || quote.partstech_ordered_at) && !orderError && (
          <div className="no-print" style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #86efac', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803d' }}>
                Parts ordered successfully — {orderResult?.part_count || (quote.parts || []).filter((p) => p.source === 'partstech').length} part{((orderResult?.part_count || 0) !== 1) ? 's' : ''} from {orderResult?.order_count || '—'} supplier{((orderResult?.order_count || 0) !== 1) ? 's' : ''}
              </div>
              {(orderResult?.order_ids || quote.partstech_order_ids || []).length > 0 && (
                <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                  Order ID{(orderResult?.order_ids || quote.partstech_order_ids || []).length > 1 ? 's' : ''}: {(orderResult?.order_ids || quote.partstech_order_ids || []).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

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
              {c?.license_plate && (
                <div style={{ fontSize: '12px', color: SLATE, marginTop: '3px' }}>
                  Plate: <strong>{c.license_state} {c.license_plate}</strong>
                </div>
              )}
            </div>
          </div>

          {/* ── Print-only: Authorized By + Parts Returned + Revised Estimate ── */}
          <div className="print-only" style={{ marginBottom: '24px' }}>

            {/* Original Estimate / Authorized By */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px 14px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>ORIGINAL ESTIMATE</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: DARK, marginBottom: '24px' }}>{formatCurrency(quote.pricing?.total || 0)}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '32px' }}>AUTHORIZED BY</div>
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', fontSize: '10px', color: SLATE }}>Customer Signature</div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px 14px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>REVISED ESTIMATE</div>
                {/* If revisions exist, show the revised total and auth info */}
                {(() => {
                  // Show revised estimate block if anything was added OR removed via revision
                  const hasRevisions = (quote.items || []).some(i => i.is_revision || i.is_removed) ||
                                       (quote.parts || []).some(p => p.is_revision || p.is_removed || p.previous_quantity != null);
                  if (!hasRevisions) return <div style={{ height: '80px' }} />;

                  // Collect auth note — from revision additions first, then removals
                  const authNote = [...(quote.items || []), ...(quote.parts || [])]
                    .find(x => x.revision_auth || x.removal_auth);
                  const noteText = authNote?.revision_auth || authNote?.removal_auth || '';

                  // Describe what changed
                  const added    = [...(quote.items || []), ...(quote.parts || [])].filter(x => x.is_revision && !x.is_removed).map(x => x.motor_db_operation || x.description);
                  const removed  = [...(quote.items || []), ...(quote.parts || [])].filter(x => x.is_removed).map(x => x.motor_db_operation || x.description);
                  const qtyChg   = (quote.parts || []).filter(x => x.previous_quantity != null).map(x => `${x.description} qty ${x.previous_quantity}→${x.quantity}`);
                  const changes = [
                    added.length   > 0 ? `Added: ${added.join(', ')}`     : '',
                    removed.length > 0 ? `Removed: ${removed.join(', ')}` : '',
                    qtyChg.length  > 0 ? `Qty changed: ${qtyChg.join(', ')}` : '',
                  ].filter(Boolean).join(' · ');

                  return (
                    <>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: DARK, marginBottom: '8px' }}>{formatCurrency(quote.pricing?.total || 0)}</div>
                      {noteText && <div style={{ fontSize: '10px', color: SLATE, marginBottom: '10px' }}>{noteText}</div>}
                      <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '4px' }}>REASON FOR REVISED ESTIMATE</div>
                      <div style={{ fontSize: '10px', color: SLATE }}>{changes}</div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Parts Returned */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px 14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '8px' }}>PARTS RETURNED</div>
              <div style={{ display: 'flex', gap: '24px', fontSize: '11px', color: DARK }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" style={{ width: '14px', height: '14px' }} /> I REQUEST THE RETURN OF REPLACED PARTS.
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" defaultChecked style={{ width: '14px', height: '14px' }} /> I DO NOT WANT REPLACED PARTS RETURNED TO ME.
                </label>
              </div>
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
              {(quote.items || []).map((item, i) => {
                const isMarkedForRemoval = revRemoveItems.includes(item.item_id);
                return (
                <div key={item.item_id} style={{
                  display: 'grid', gridTemplateColumns: revMode ? '24px 1fr 80px 80px 90px' : '1fr 80px 80px 90px',
                  padding: '12px 14px', borderBottom: i < quote.items.length - 1 ? `1px solid ${BORDER}` : 'none',
                  backgroundColor: item.is_removed ? '#fef2f2' : isMarkedForRemoval ? '#fff1f1' : i % 2 === 0 ? 'white' : '#fafafa',
                }}>
                  {revMode && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!item.is_removed && (
                        <input type="checkbox" checked={isMarkedForRemoval}
                          onChange={(e) => {
                            if (e.target.checked) setRevRemoveItems(prev => [...prev, item.item_id]);
                            else setRevRemoveItems(prev => prev.filter(id => id !== item.item_id));
                          }}
                          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#dc2626' }} />
                      )}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: item.is_removed ? '#94a3b8' : DARK, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', textDecoration: item.is_removed || isMarkedForRemoval ? 'line-through' : 'none' }}>
                      {item.motor_db_operation}
                      {item.qualifier_description && <span style={{ color: SLATE, fontWeight: '400' }}> · {item.qualifier_description}</span>}
                      {!item.mechanical_estimating_id && !item.is_removed && (
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}>MANUAL</span>
                      )}
                      {item.is_revision && !item.is_removed && (
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}>ADDED</span>
                      )}
                      {item.is_removed && (
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', letterSpacing: '0.5px' }}>REMOVED</span>
                      )}
                      {isMarkedForRemoval && !item.is_removed && (
                        <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', letterSpacing: '0.5px' }}>WILL REMOVE</span>
                      )}
                    </div>
                    {item.motor_db_description && !item.is_removed && (
                      <div style={{ fontSize: '11px', color: SLATE, marginTop: '1px' }}>{item.motor_db_description}</div>
                    )}
                    {item.is_revision && item.revision_auth && !item.is_removed && (
                      <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px', fontStyle: 'italic' }}>Auth: {item.revision_auth}</div>
                    )}
                    {item.is_removed && item.removal_auth && (
                      <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px', fontStyle: 'italic' }}>Removed: {item.removal_auth}</div>
                    )}
                    {item.motor_db_footnote && !item.is_removed && (
                      <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>ℹ️ {item.motor_db_footnote}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: item.is_removed ? '#94a3b8' : SLATE, textAlign: 'right', paddingTop: '1px' }}>{item.motor_time}h</div>
                  <div style={{ fontSize: '13px', color: item.is_removed ? '#94a3b8' : SLATE, textAlign: 'right', paddingTop: '1px' }}>{item.quantity}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: item.is_removed ? '#94a3b8' : DARK, textAlign: 'right', paddingTop: '1px', textDecoration: item.is_removed ? 'line-through' : 'none' }}>
                    {formatCurrency(parseFloat(item.labor_price) * (item.quantity || 1))}
                  </div>
                </div>
                );
              })}
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
          {(quote.parts || []).length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={sectionLabel}>PARTS</div>
              {true && (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 90px', backgroundColor: '#f8fafc', padding: '8px 14px', borderBottom: `1px solid ${BORDER}` }}>
                    {['PART #', 'DESCRIPTION', 'QTY', 'UNIT', 'TOTAL'].map((h) => (
                      <div key={h} style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', textAlign: h === 'PART #' || h === 'DESCRIPTION' ? 'left' : 'right' }}>{h}</div>
                    ))}
                  </div>
                  {(quote.parts || []).map((part, i, arr) => {
                    const isMarkedForRemoval = revRemoveParts.includes(part.part_id);
                    // Removed parts: hidden on screen, shown on print for audit trail
                    if (part.is_removed && !isMarkedForRemoval) {
                      return (
                        <div key={part.part_id} className="print-only" style={{
                          display: 'grid', gridTemplateColumns: '120px 1fr 80px 80px 90px',
                          padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                          backgroundColor: '#fef2f2', alignItems: 'center',
                        }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{part.part_number || '—'}</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>{part.description}</span>
                              <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', letterSpacing: '0.5px' }}>REMOVED</span>
                            </div>
                            {part.removal_auth && <div style={{ fontSize: '10px', color: '#dc2626', fontStyle: 'italic', marginTop: '2px' }}>Removed: {part.removal_auth}</div>}
                          </div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', textDecoration: 'line-through' }}>{part.quantity}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', textDecoration: 'line-through' }}>{formatCurrency(part.unit_price)}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'right', textDecoration: 'line-through' }}>{formatCurrency(part.line_total)}</div>
                        </div>
                      );
                    }
                    return (
                    <div key={part.part_id} style={{
                      display: 'grid', gridTemplateColumns: revMode ? '24px 120px 1fr 80px 80px 90px' : '120px 1fr 80px 80px 90px',
                      padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
                      backgroundColor: isMarkedForRemoval ? '#fff1f1' : i % 2 === 0 ? 'white' : '#fafafa', alignItems: 'center',
                    }}>
                      {/* Revision mode removal checkbox */}
                      {revMode && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input type="checkbox" checked={isMarkedForRemoval}
                            onChange={(e) => {
                              if (e.target.checked) setRevRemoveParts(prev => [...prev, part.part_id]);
                              else setRevRemoveParts(prev => prev.filter(id => id !== part.part_id));
                            }}
                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#dc2626' }} />
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: SLATE, fontFamily: 'monospace' }}>{part.part_number || '—'}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: isMarkedForRemoval ? '#94a3b8' : DARK }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', textDecoration: isMarkedForRemoval ? 'line-through' : 'none' }}>
                          {part.description}
                          {part.is_revision && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', letterSpacing: '0.5px' }}>ADDED</span>
                          )}
                          {part.previous_quantity != null && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', letterSpacing: '0.5px' }}>QTY CHANGED</span>
                          )}
                          {part.source === 'partstech' && (
                            <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #7dd3fc', letterSpacing: '0.5px' }}>PT</span>
                          )}
                          {isMarkedForRemoval && (
                            <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', letterSpacing: '0.5px' }}>WILL REMOVE</span>
                          )}
                        </div>
                        {part.is_revision && part.revision_auth && (
                          <div style={{ fontSize: '10px', color: '#92400e', fontStyle: 'italic', marginTop: '2px' }}>Auth: {part.revision_auth}</div>
                        )}
                        {part.previous_quantity != null && part.qty_change_auth && (
                          <div style={{ fontSize: '10px', color: '#1d4ed8', fontStyle: 'italic', marginTop: '2px' }}>Qty: {part.previous_quantity} → {part.quantity} · {part.qty_change_auth}</div>
                        )}
                      </div>
                      {/* Qty — stepper in revise mode, static otherwise */}
                      <div style={{ textAlign: 'right' }}>
                        {revMode && !isMarkedForRemoval ? (() => {
                          const pending = revUpdateParts.find(u => u.part_id === part.part_id);
                          const currentQty = pending ? pending.quantity : part.quantity;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                              <button onClick={() => {
                                const newQty = Math.max(1, currentQty - 1);
                                if (newQty === part.quantity) {
                                  setRevUpdateParts(prev => prev.filter(u => u.part_id !== part.part_id));
                                } else {
                                  setRevUpdateParts(prev => {
                                    const existing = prev.find(u => u.part_id === part.part_id);
                                    if (existing) return prev.map(u => u.part_id === part.part_id ? { ...u, quantity: newQty } : u);
                                    return [...prev, { part_id: part.part_id, quantity: newQty }];
                                  });
                                }
                              }} style={{ width: '20px', height: '20px', border: `1px solid ${BORDER}`, borderRadius: '3px', background: 'white', fontSize: '13px', cursor: currentQty <= 1 ? 'not-allowed' : 'pointer', color: SLATE, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: pending ? '#d97706' : DARK, minWidth: '18px', textAlign: 'center' }}>{currentQty}</span>
                              <button onClick={() => {
                                const newQty = Math.min(99, currentQty + 1);
                                setRevUpdateParts(prev => {
                                  const existing = prev.find(u => u.part_id === part.part_id);
                                  if (existing) return prev.map(u => u.part_id === part.part_id ? { ...u, quantity: newQty } : u);
                                  return [...prev, { part_id: part.part_id, quantity: newQty }];
                                });
                              }} style={{ width: '20px', height: '20px', border: `1px solid ${BORDER}`, borderRadius: '3px', background: 'white', fontSize: '13px', cursor: currentQty >= 99 ? 'not-allowed' : 'pointer', color: SLATE, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                          );
                        })() : (
                          <span style={{ fontSize: '13px', color: SLATE }}>{part.quantity}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: SLATE, textAlign: 'right' }}>{formatCurrency(part.unit_price)}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: isMarkedForRemoval ? '#94a3b8' : DARK, textAlign: 'right', textDecoration: isMarkedForRemoval ? 'line-through' : 'none' }}>
                        {(() => {
                          const pending = revUpdateParts.find(u => u.part_id === part.part_id);
                          const qty = pending ? pending.quantity : part.quantity;
                          return formatCurrency(qty * parseFloat(part.unit_price));
                        })()}
                      </div>
                    </div>
                    );
                  })}
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
            <div style={{ marginBottom: '24px', border: '2px solid #d97706', borderRadius: '8px', padding: '16px', backgroundColor: '#fffbeb' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', letterSpacing: '1px', marginBottom: '4px' }}>✏️ REVISE QUOTE</div>
              <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '14px', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                Check items above to remove them, or add new labor/parts below. All changes require an authorization note.
              </p>

              {/* Summary of staged changes */}
              {(revRemoveItems.length > 0 || revRemoveParts.length > 0) && (
                <div style={{ marginBottom: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>REMOVING:</div>
                  {revRemoveItems.map(id => {
                    const item = (quote.items || []).find(i => i.item_id === id);
                    return item ? <div key={id} style={{ fontSize: '11px', color: '#dc2626' }}>• {item.motor_db_operation}{item.qualifier_description ? ` · ${item.qualifier_description}` : ''}</div> : null;
                  })}
                  {revRemoveParts.map(id => {
                    const part = (quote.parts || []).find(p => p.part_id === id);
                    return part ? <div key={id} style={{ fontSize: '11px', color: '#dc2626' }}>• {part.description}</div> : null;
                  })}
                </div>
              )}

              {revUpdateParts.length > 0 && (
                <div style={{ marginBottom: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', marginBottom: '4px' }}>QTY CHANGES:</div>
                  {revUpdateParts.map(u => {
                    const part = (quote.parts || []).find(p => p.part_id === u.part_id);
                    return part ? <div key={u.part_id} style={{ fontSize: '11px', color: '#1d4ed8' }}>• {part.description}: {part.quantity} → {u.quantity}</div> : null;
                  })}
                </div>
              )}

              {/* Staged labor items to add */}
              {revItems.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>ADDING LABOR:</div>
                  {revItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'white', borderRadius: '6px', marginBottom: '4px', border: `1px solid ${BORDER}` }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: DARK }}>
                          {item.motor_db_operation}{item.qualifier_description ? ` · ${item.qualifier_description}` : ''}
                          {item.is_manual && (
                            <span style={{ marginLeft: '6px', display: 'inline-block', backgroundColor: '#f59e0b', color: 'white', fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.5px', verticalAlign: 'middle' }}>MANUAL</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: SLATE }}>{item.motor_time}h × {formatCurrency(item.labor_price)} × qty {item.quantity}</div>
                      </div>
                      <button onClick={() => setRevItems(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Staged parts to add */}
              {revParts.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '6px' }}>ADDING PARTS:</div>
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

              {/* Add labor button */}
              <div style={{ marginBottom: '10px' }}>
                <button onClick={() => {
                  sessionStorage.setItem('jl_revision_context', JSON.stringify({
                    quote_id:         quote.quote_id,
                    short_code:       quote.short_code,
                    base_vehicle_id:  quote.vehicle?.base_vehicle_id,
                    // Prefer top-level vehicle_id / engine_config_id (Sub-phase 2B+).
                    // Fall back to the legacy nested config path for quotes created
                    // before these columns existed — those quotes have NULL in the
                    // top-level columns but still have engine_config_id inside config.
                    // vehicle_id has no legacy fallback; quotes without it skip xref
                    // filtering during revision (same as pre-2A behavior).
                    vehicle_id:       quote.vehicle?.vehicle_id ?? null,
                    engine_config_id: quote.vehicle?.engine_config_id
                                       ?? quote.vehicle?.config?.engine_config_id
                                       ?? null,
                    vehicle_display:  quote.vehicle?.display,
                    config_label:     quote.vehicle?.config
                      ? `${quote.vehicle.config.engine_liter}L · ${quote.vehicle.config.fuel_type_name || 'GAS'} · ${quote.vehicle.config.drive_type_name}`
                      : '',
                  }));
                  window.location.hash = '#/mechanical?mode=revision';
                }} style={{ width: '100%', padding: '10px', border: '2px dashed #92400e', borderRadius: '8px', backgroundColor: 'white', color: '#92400e', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' }}>
                  🔧 Add Labor Services
                </button>
              </div>

              {/* PartsTech punchout for revision */}
              <div style={{ marginBottom: '10px' }}>
                {!revPtPolling ? (
                  <button onClick={handleRevPunchout} disabled={revPtLoading}
                    style={{ width: '100%', padding: '10px', border: '2px dashed #0369a1', borderRadius: '8px', backgroundColor: 'white', color: '#0369a1', fontSize: '13px', fontWeight: '700', cursor: revPtLoading ? 'not-allowed' : 'pointer', textAlign: 'center' }}>
                    {revPtLoading ? '⏳ Opening PartsTech…' : '📦 Find Parts on PartsTech'}
                  </button>
                ) : (
                  <div style={{ padding: '10px', border: '2px solid #0369a1', borderRadius: '8px', backgroundColor: '#f0f9ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '4px' }}>⏳ Waiting for PartsTech…</div>
                    <div style={{ fontSize: '11px', color: SLATE, marginBottom: '8px' }}>Select parts in the PartsTech tab and click Submit Quote</div>
                    <button onClick={() => {
                      if (revPtIntervalRef.current) { clearInterval(revPtIntervalRef.current); revPtIntervalRef.current = null; }
                      setRevPtPolling(false); setRevPtSessionId(null);
                    }} style={{ padding: '4px 14px', border: `1px solid ${BORDER}`, borderRadius: '20px', background: 'white', fontSize: '11px', cursor: 'pointer', color: SLATE }}>Cancel</button>
                  </div>
                )}
                {revPtError && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>{revPtError}</div>}
              </div>

              {/* Manual add labor form — CSA-entered misc labor for revisions.
                  Mirrors the add-labor flow from MechanicalFinder with the
                  same sanitization + 15-minute dropdown (0.25-3.0 hr). On Add,
                  pushes into revItems with is_manual=true. Server recomputes
                  labor_price from labor rate — client-side number is display only. */}
              <div style={{ backgroundColor: 'white', borderRadius: '6px', padding: '10px', border: `1px solid ${BORDER}`, marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '8px' }}>ADD MANUAL LABOR</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: '6px', alignItems: 'end' }}>
                  <input type="text" placeholder="Description (e.g. Remove aftermarket skid plate) *"
                    value={revManualLaborForm.description}
                    onChange={(e) => setRevManualLaborForm(f => ({
                      ...f,
                      description: e.target.value.replace(/[^A-Za-z0-9 \-\/\.&()]/g, '').slice(0, 120),
                    }))}
                    maxLength={120}
                    style={inputStyle} />
                  <select
                    value={revManualLaborForm.hours}
                    onChange={(e) => setRevManualLaborForm(f => ({ ...f, hours: e.target.value }))}
                    style={inputStyle}
                  >
                    {['0.25','0.50','0.75','1.00','1.25','1.50','1.75','2.00','2.25','2.50','2.75','3.00'].map((h) => (
                      <option key={h} value={h}>{h} hr</option>
                    ))}
                  </select>
                  <button onClick={() => {
                    const desc = revManualLaborForm.description.trim();
                    const hrs  = parseFloat(revManualLaborForm.hours);
                    if (!desc || !hrs) return;
                    // Display labor_price only — server recomputes from quote_config on save
                    const displayLaborRate = 189.99;
                    setRevItems(prev => [...prev, {
                      is_manual:                true,
                      mechanical_estimating_id: null,
                      motor_db_section:         'MANUAL',
                      motor_db_group:           'MANUAL LABOR',
                      motor_db_subgroup:        'MANUAL LABOR',
                      motor_db_operation:       desc,
                      qualifier_description:    null,
                      motor_time:               hrs,
                      labor_price:              Math.round(hrs * displayLaborRate * 100) / 100,
                      motor_db_description:     null,
                      motor_db_footnote:        null,
                      is_additional_operation:  false,
                      quantity:                 1,
                    }]);
                    setRevManualLaborForm({ description: '', hours: '0.50' });
                  }} disabled={!revManualLaborForm.description.trim()}
                    style={{ padding: '8px 12px', border: 'none', borderRadius: '6px', backgroundColor: !revManualLaborForm.description.trim() ? '#ccc' : '#92400e', color: 'white', fontSize: '11px', fontWeight: '700', cursor: !revManualLaborForm.description.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    + Add
                  </button>
                </div>
              </div>

              {/* Manual add part form */}
              <div style={{ backgroundColor: 'white', borderRadius: '6px', padding: '10px', border: `1px solid ${BORDER}`, marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: SLATE, letterSpacing: '1px', marginBottom: '8px' }}>ADD PART MANUALLY</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 50px 80px auto', gap: '6px', alignItems: 'end' }}>
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
                    + Add
                  </button>
                </div>
              </div>

              {/* Authorization note */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>AUTHORIZATION NOTE * (required for all changes)</label>
                <input type="text" value={revAuth} onChange={(e) => setRevAuth(e.target.value)}
                  placeholder='e.g. "Customer authorized brake line repair via phone at 2:15pm"'
                  style={{ ...inputStyle, borderColor: '#f59e0b' }} />
              </div>

              {revError && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px' }}>{revError}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSubmitRevision} disabled={savingRev || !revAuth.trim() || revAuth.trim().length < 5}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '20px', backgroundColor: !revAuth.trim() || revAuth.trim().length < 5 ? '#ccc' : '#d97706', color: 'white', fontSize: '13px', fontWeight: '700', cursor: !revAuth.trim() || revAuth.trim().length < 5 ? 'not-allowed' : 'pointer' }}>
                  {savingRev ? 'Saving…' : 'Submit Revision'}
                </button>
                <button onClick={() => { if (revPtIntervalRef.current) { clearInterval(revPtIntervalRef.current); revPtIntervalRef.current = null; } setRevMode(false); setRevItems([]); setRevParts([]); setRevRemoveItems([]); setRevRemoveParts([]); setRevUpdateParts([]); setRevAuth(''); setRevError(''); setRevManualLaborForm({ description: '', hours: '0.50' }); setRevPtSessionId(null); setRevPtPolling(false); }}
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
            <strong style={{ color: SLATE }}>INFORMATIONAL QUOTE ONLY:</strong> This document is provided for informational purposes and is not an official BAR estimate.
            An official written estimate will be provided by the Jiffy Lube Point of Sale System when your vehicle is checked in for service.
            Final charges may vary based on actual parts used and additional labor discovered during service.
            Labor times are based on MOTOR published estimated work times. All parts are new unless otherwise specified.
            No storage or storage fees apply. This quote is valid through {formatDate(quote.expires_at)}.
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
