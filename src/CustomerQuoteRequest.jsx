// =============================================================================
// CustomerQuoteRequest — "Continue to Quote" for a CUSTOMER (not signed in)
// =============================================================================
// Staff go on to QuoteBuilder as before. Everyone else used to land on the
// staff PIN screen; now they get this: quantity, name, a text code to prove
// the phone, and one tap to a real priced quote (#/quote/<code>), built by the
// request-tire-quote function. The store is emailed and the quote shows in
// Quotes > "Customer requests".
//
// Prices here are the same public ones TireFinder already shows; the server
// recomputes everything from the catalog, so nothing on this screen can change
// what the customer is charged.
//
// Staggered fitments (different front and rear tires) are not offered online:
// the customer is asked to call, as the server would refuse them anyway.
// =============================================================================

import React, { useState } from 'react';
import { API_BASE, SUPABASE_ANON_KEY } from './config';

const RED = '#8b1538';
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

// Google Ads conversion (Goals > Contact): a customer requested a quote.
// Set in index.html's tag; never fires for staff (they never reach this screen).
function trackQuoteRequest(total) {
  try {
    if (typeof window.gtag === 'function' && window.AW_QUOTE_REQUEST) {
      window.gtag('event', 'conversion', {
        send_to: window.AW_QUOTE_REQUEST, value: Number(total) || 1.0, currency: 'USD',
      });
    }
  } catch { /* never block the customer on analytics */ }
}

async function post(fn, body) {
  const res = await fetch(`${API_BASE}/${fn}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const field = {
  width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: 15, boxSizing: 'border-box', marginTop: 4,
};
const label = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginTop: 12 };
const primary = (disabled) => ({
  width: '100%', marginTop: 16, padding: '13px', borderRadius: 24, border: 'none',
  background: disabled ? '#c9a3b0' : RED, color: 'white', fontWeight: 700, fontSize: 15,
  cursor: disabled ? 'default' : 'pointer',
});

export default function CustomerQuoteRequest({ tire, staggered, store, defaultQty, vehicle, plate, onClose }) {
  const [qty, setQty] = useState(defaultQty && defaultQty >= 1 && defaultQty <= 6 ? defaultQty : 4);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState('form'); // form | code | saving
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const price = tire?.consumer_price || 0;
  const isNexen = (tire?.brand_code || '').toUpperCase() === 'NEX';
  const callHref = store?.phone ? `tel:${store.phone.replace(/\D/g, '')}` : null;

  async function sendCode() {
    setError(null);
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!firstName.trim()) { setError('Please enter your first name.'); return; }
    if (digits.length !== 10) { setError('Please enter a 10-digit mobile number.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('That email address doesn\'t look right.'); return; }
    setBusy(true);
    const { data } = await post('send-verification-code', { channel: 'sms', destination: digits, store_id: store.id });
    setBusy(false);
    if (!data?.verification_id) { setError('We couldn\'t text that number. Please check it and try again.'); return; }
    setVerificationId(data.verification_id);
    setCode('');
    setStage('code');
  }

  async function verifyAndSubmit() {
    setError(null);
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code we texted you.'); return; }
    setBusy(true);
    const v = await post('verify-code', { verification_id: verificationId, code });
    if (v.data?.verified !== true || !v.data?.vehicle_scope) {
      setBusy(false);
      setCode('');
      setError('That code didn\'t work. Please check it and try again.');
      return;
    }
    setStage('saving');
    const r = await post('request-tire-quote', {
      vehicle_scope: v.data.vehicle_scope,
      store_id: store.id,
      part_number: tire.part_number,
      quantity: qty,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      license_plate: plate?.plate || null,
      license_state: plate?.state || null,
      vehicle: vehicle || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (r.data?.success && r.data.short_code) {
      trackQuoteRequest(r.data.total_amount);
      window.location.hash = `#/quote/${r.data.short_code}`;
      return;
    }
    setStage('form');
    setError(r.data?.error === 'call_store' || r.data?.error === 'too_many_requests'
      ? (r.data.message || 'Please call the store for this quote.')
      : 'We couldn\'t create your quote. Please try again, or call the store.');
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440,
          maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1b1b1b' }}>Get your tire quote</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#777' }}>×</button>
        </div>

        {staggered ? (
          <>
            <p style={{ fontSize: 15, color: '#333', marginTop: 12 }}>
              Your vehicle uses different front and rear tires. Give Jiffy Lube {store?.name} a call and we'll quote the exact set.
            </p>
            {callHref && <a href={callHref} style={{ ...primary(false), display: 'block', textAlign: 'center', textDecoration: 'none' }}>Call {store.phone}</a>}
          </>
        ) : (
          <>
            <div style={{ marginTop: 12, padding: 12, background: '#f8f4f5', borderRadius: 10, fontSize: 14 }}>
              <div style={{ fontWeight: 700 }}>{tire?.sales_class || tire?.name}</div>
              <div style={{ color: '#555' }}>{tire?.tire_size} · ${price.toFixed(2)} each</div>
              <div style={{ color: '#555' }}>Jiffy Lube {store?.name}</div>
              {isNexen && <div style={{ color: RED, fontWeight: 600, marginTop: 4 }}>Buy 3, get the 4th free on a set of 4 Nexen tires</div>}
            </div>

            <label style={label}>How many tires?</label>
            <select value={qty} onChange={(e) => setQty(Number(e.target.value))} style={field} disabled={stage !== 'form'}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            {stage === 'form' && (
              <>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>First name</label>
                    <input style={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Last name</label>
                    <input style={field} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                  </div>
                </div>
                <label style={label}>Mobile number</label>
                <input style={field} value={phone} inputMode="tel" autoComplete="tel"
                  onChange={(e) => setPhone(e.target.value)} placeholder="(805) 555-1234" />
                <label style={label}>Email (optional)</label>
                <input style={field} value={email} inputMode="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
                <label style={label}>Anything we should know? (optional)</label>
                <textarea style={{ ...field, minHeight: 60 }} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
                <button style={primary(busy)} disabled={busy} onClick={sendCode}>Text me a code</button>
                <p style={{ fontSize: 11, color: '#777', marginTop: 10, lineHeight: 1.4 }}>
                  We'll text a 6-digit code to confirm your number, then show your quote right away and let the store know.
                  Msg &amp; data rates may apply. See our <a href="#/privacy-policy">Privacy Policy</a>.
                </p>
              </>
            )}

            {stage !== 'form' && (
              <>
                <label style={label}>Enter the 6-digit code we texted you</label>
                <input style={{ ...field, letterSpacing: 8, textAlign: 'center', fontSize: 20 }}
                  value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                <button style={primary(busy || code.length !== 6)} disabled={busy || code.length !== 6} onClick={verifyAndSubmit}>
                  {stage === 'saving' ? 'Building your quote…' : 'Show my quote'}
                </button>
                <button onClick={() => { setStage('form'); setError(null); }} disabled={busy}
                  style={{ width: '100%', marginTop: 8, border: 'none', background: 'none', color: '#555', cursor: 'pointer' }}>
                  ← Change my number
                </button>
              </>
            )}

            {callHref && (
              <p style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                Rather talk to someone? <a href={callHref} style={{ color: RED, fontWeight: 600 }}>Call {store.phone}</a>
              </p>
            )}
          </>
        )}

        {error && <p style={{ color: '#b91c1c', fontSize: 14, marginTop: 10, textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  );
}
