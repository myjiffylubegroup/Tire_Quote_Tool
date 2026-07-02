// =============================================================================
// QUOTE VIEW - Customer-Facing Quote Display v10
// =============================================================================
// Route: #/quote/:code
// Updated: 2026-07-01
// v10 Changes:
//   - Nexen rebate config now loaded from quote_config (key: nexen_rebate_2026)
//     instead of a hardcoded table — future offer changes are a DB update only
//   - Rebate shows when the offer is active TODAY (Pacific), not at created_at:
//     pre-offer quotes viewed during the window now show the rebate (customer
//     qualifies if they buy now); quotes viewed after the window correctly don't
//   - Date window compared as YYYY-MM-DD strings in America/Los_Angeles —
//     fixes the old UTC-midnight parse that ended offers a day early
//   - Staggered quotes: front AND rear tire must match the same tier
//   - "Offer valid" line + rebate URL now dynamic from config (incl. submit-by)
//   - Respects config "active" flag
// v9 Changes:
//   - Removed standalone tire card when comparison section exists (saves print space)
//   - Moved part#, speed, load to Chosen comparison card
//   - Compact fallback tire card when no comparison (no alternatives)
//   - Warranty disclaimer always shows (not gated on warranty_miles)
//   - Removed standalone warranty row (redundant with comparison)
// v8 Changes:
//   - Tire replacement reasons editable in edit mode (16 condition codes)
//   - ⚠️ Issue toggle per tire with multi-select dropdown
//   - Reasons sent to update-quote on save
// v7 Changes:
//   - Staggered fitment display: dual tire cards (front/rear) with axle labels
//   - Staggered pricing breakdown: separate front/rear tire line items
//   - Hide comparison section for staggered quotes (no alt tires)
// v6 Changes:
//   - "Prepared by" employee name section above footer
//   - Tire replacement reasons: red override on tread tiles, callout alerts
//   - Re-quote passes tire_replacement_reasons to QuoteBuilder
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
import { apiCall, apiCallPublic } from './apiClient';

import { API_BASE, REST_BASE, SUPABASE_ANON_KEY } from './config';
const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';

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

// =============================================================================
// NEXEN REBATE — loaded at runtime from quote_config (key: nexen_rebate_2026).
// To change the offer (dates, tiers, amounts, URL), UPDATE that row in the DB.
// No code deploy required. Config shape:
//   { active, min_qty, start_date, end_date, submit_by?, rebate_url,
//     tiers: [{ amount, description, sales_classes: [...] }] }
// =============================================================================

// Today's date as YYYY-MM-DD in Pacific time (store timezone). String
// comparison against config dates avoids UTC-midnight parsing bugs that
// previously ended offers a day early.
const todayInPacific = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

// '2026-07-31' → '7/31/26' for customer-facing display
const formatConfigDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0].slice(2)}`;
};

// Returns { amount, label, url, validText } if the quote qualifies for the
// current Nexen offer, otherwise null. Qualification is based on whether the
// offer is active TODAY — a customer viewing any quote during the window can
// claim the rebate if they purchase now.
function getNexenRebate(cfg, tireName, rearTireName, isStaggered, quantity) {
  if (!cfg || cfg.active === false) return null;
  if (!tireName || !cfg.start_date || !cfg.end_date) return null;

  // Offer must be active today (Pacific)
  const today = todayInPacific();
  if (today < cfg.start_date || today > cfg.end_date) return null;

  // Minimum quantity (total tires on the quote)
  if ((quantity || 0) < (cfg.min_qty || 4)) return null;

  // Match tire name (= sales_class) against tier sales_classes (exact match)
  const tier = (cfg.tiers || []).find(t =>
    (t.sales_classes || []).includes(tireName)
  );
  if (!tier) return null;

  // Staggered fitment: rear tire must be the same qualifying model —
  // otherwise the customer isn't buying 4 of a qualifying tire
  if (isStaggered && !(tier.sales_classes || []).includes(rearTireName)) return null;

  const validText = `Purchase by ${formatConfigDate(cfg.end_date)}` +
    (cfg.submit_by ? ` · Submit by ${formatConfigDate(cfg.submit_by)}` : '');

  return { amount: tier.amount, label: tier.description, url: cfg.rebate_url, validText };
}

// Tire replacement reason options (must match generate-quote/update-quote codes)
const REPLACEMENT_REASON_OPTIONS = [
  { code: 'sidewall_damage', label: 'Sidewall Damage / Cracking' },
  { code: 'sidewall_bulge', label: 'Sidewall Bulge / Delamination' },
  { code: 'belt_separation', label: 'Belt Separation / Cord Exposure' },
  { code: 'bead_damage', label: 'Bead Damage' },
  { code: 'tread_damage', label: 'Tread Damage (Chunks, Cuts, Gouging)' },
  { code: 'uneven_wear', label: 'Uneven Wear (Cupping, Feathering, Edge Wear)' },
  { code: 'flat_spot', label: 'Flat Spot / Vibration' },
  { code: 'unrepairable_puncture', label: 'Puncture in Non-Repairable Zone' },
  { code: 'improper_repair', label: 'Prior Improper / Failed Repair' },
  { code: 'dry_rot', label: 'Dry Rot / Weather Cracking' },
  { code: 'age', label: 'Age (8+ Years)' },
  { code: 'driven_flat', label: 'Driven Flat — Internal Damage' },
  { code: 'road_hazard_impact', label: 'Road Hazard / Curb Impact Damage' },
  { code: 'mismatched', label: 'Mismatched Tires on Same Axle' },
  { code: 'axle_match', label: 'Axle Match — Other Tire Being Replaced' },
  { code: 'awd_match', label: 'AWD/4WD — All Four Must Match' },
];

// ─── Tread Tile Component ───
const TreadTile = ({ label, data }) => {
  if (!data) return null;
  
  // If tire has replacement reasons, override to red/REPLACE regardless of depth
  const hasReasons = data.replacement_reasons && data.replacement_reasons.length > 0;
  const info = hasReasons 
    ? { status: 'replace', color: '#dc2626', bgColor: '#fef2f2', label: 'REPLACE', cssClass: 'replace' }
    : getTreadInfo(data.lowest);
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
      {hasReasons && (
        <div style={{ fontSize: '7px', color: '#991b1b', fontWeight: '600', marginTop: '3px', lineHeight: '1.3' }}>
          ⚠️ {data.replacement_reasons.join(', ')}
        </div>
      )}
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
const TreadDiagram = ({ treadData, replacementReasons }) => {
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

  // Staff detection - hide staff-only buttons for customers
  const isStaff = typeof window !== 'undefined' && !!localStorage.getItem('jl_staff_auth');
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
  const [editReasons, setEditReasons] = useState({
    lf: [], rf: [], lr: [], rr: [],
  });

  // Nexen rebate config — loaded from quote_config (key: nexen_rebate_2026)
  const [nexenConfig, setNexenConfig] = useState(null);

  const getShortCode = () => {
    const hash = window.location.hash;
    const match = hash.match(/\/quote\/([A-Z0-9]+)/i);
    return match ? match[1] : null;
  };

  // Fetch Nexen rebate config via Supabase REST (same pattern as QuoteBuilder).
  // Reads through v_public_config — quote_config itself is locked to anon
  // (it held staff PINs); the view exposes only explicitly public keys.
  useEffect(() => {
    const fetchRebateConfig = async () => {
      try {
        const configResponse = await fetch(
          `${REST_BASE}/v_public_config?config_key=eq.nexen_rebate_2026&select=config_value`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
        const configData = await configResponse.json();
        if (configData && configData[0]?.config_value) {
          setNexenConfig(configData[0].config_value);
        }
      } catch (e) {
        console.error('Failed to fetch Nexen rebate config:', e);
      }
    };
    fetchRebateConfig();
  }, []);

  useEffect(() => {
    const fetchQuote = async () => {
      const code = getShortCode();
      if (!code) {
        setError('No quote code provided');
        setLoading(false);
        return;
      }

      try {
        const response = await apiCallPublic(`${API_BASE}/get-quote?code=${code}`);
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
      const response = await apiCall(`${API_BASE}/email-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quote.quote_id, email_override: email })
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
      const response = await apiCall(`${API_BASE}/sms-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.quote_id,
          phone_override: phone !== quote?.customer?.phone?.replace(/\D/g, '') ? phone : null
        })
      });
      const data = await response.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Quote texted to ${formatPhone(phone)}` });
      } else if (data.opted_out) {
        // Customer previously replied STOP — show re-subscribe instructions
        const storeNumber = data.store_number ? formatPhone(data.store_number) : 'the store number';
        setActionMessage({ 
          type: 'warning', 
          text: `⚠️ This customer previously opted out of SMS. Ask them to text START to ${storeNumber} to re-subscribe, then try again.` 
        });
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
      // create-paypal-invoice v3 is dual-mode, mirroring get-quote:
      //   staff → apiCall (X-Staff-Token) with quote_id
      //   customer → apiCallPublic with the short code from the URL — the
      //     unguessable code is the authorization, same trust model that
      //     served them the quote. apiCall would bounce token-less customers
      //     to the PIN screen before any request was sent.
      const invoiceFetch = isStaff ? apiCall : apiCallPublic;
      const invoiceBody = isStaff
        ? { quote_id: quote.quote_id }
        : { code: getShortCode() };
      const response = await invoiceFetch(`${API_BASE}/create-paypal-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceBody)
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
    // Load existing replacement reasons
    const reasons = quote.tire_replacement_reasons || {};
    setEditReasons({
      lf: Array.isArray(reasons.lf) ? reasons.lf : [],
      rf: Array.isArray(reasons.rf) ? reasons.rf : [],
      lr: Array.isArray(reasons.lr) ? reasons.lr : [],
      rr: Array.isArray(reasons.rr) ? reasons.rr : [],
    });
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

      const response = await apiCall(`${API_BASE}/update-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          tire_replacement_reasons: (() => {
            const clean = {
              lf: editReasons.lf.filter(r => r !== '_pending'),
              rf: editReasons.rf.filter(r => r !== '_pending'),
              lr: editReasons.lr.filter(r => r !== '_pending'),
              rr: editReasons.rr.filter(r => r !== '_pending'),
            };
            return (clean.lf.length || clean.rf.length || clean.lr.length || clean.rr.length)
              ? clean : null;
          })(),
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
        const refreshResp = await apiCall(`${API_BASE}/get-quote?id=${quote.quote_id}`);
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
      tire_replacement_reasons: quote.tire_replacement_reasons || null,
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
  const isStaggered = quote.is_staggered || false;
  const tireRear = quote.tire_rear || null;

  // ─── Nexen rebate auto-calculation ───
  // Config-driven (quote_config), based on tire name (sales_class), quantity,
  // and whether the offer is active today — no CSA input required
  const nexenRebate = getNexenRebate(nexenConfig, tire?.name, tireRear?.name, isStaggered, p?.quantity);

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
              {quote.created_by?.display_name && (
                <div style={{ fontWeight: '600', color: '#1e40af', marginTop: '2px' }}>Prepared by: {quote.created_by.display_name}</div>
              )}
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

          {/* ─── Recommended Tire Card(s) ─── */}
          {/* Staggered: always show dual cards (no comparison section) */}
          {/* Standard with alternatives: skip — tire info moves to comparison Chosen card */}
          {/* Standard without alternatives: show compact card */}
          {isStaggered && tireRear ? (
            // ===== STAGGERED: Dual tire cards =====
            <>
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <span style={{ backgroundColor: '#8b1538', color: 'white', padding: '3px 14px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
                  ⚡ STAGGERED FITMENT — DIFFERENT FRONT / REAR TIRES
                </span>
              </div>
              {/* Front Tire */}
              <div style={{ border: '2px solid #cbd5e1', borderLeft: '5px solid #8b1538', borderRadius: '10px 10px 0 0', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#8b1538', letterSpacing: '1px', marginBottom: '2px' }}>▲ FRONT AXLE</div>
                  <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '700', letterSpacing: '1px', marginBottom: '2px' }}>
                    {tire?.brand} • {tire?.size} {tire?.load_range && tire.load_range}
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{tire?.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {tire?.speed_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Speed: {tire.speed_rating}</span>}
                    {tire?.load_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Load: {tire.load_rating}</span>}
                    {tire?.part_number && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Part# {tire.part_number}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700' }}>Qty: {p?.quantity_front || 2}</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b1538', lineHeight: 1 }}>{formatCurrency(p?.price_per_tire)}</div>
                  <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>per tire</div>
                </div>
              </div>
              {/* Rear Tire */}
              <div style={{ border: '2px solid #cbd5e1', borderLeft: '5px solid #6b21a8', borderTop: '2px dashed #9b59b6', borderRadius: '0 0 10px 10px', padding: '14px 22px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#6b21a8', letterSpacing: '1px', marginBottom: '2px' }}>▼ REAR AXLE</div>
                  <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '700', letterSpacing: '1px', marginBottom: '2px' }}>
                    {tireRear?.brand} • {tireRear?.size} {tireRear?.load_range && tireRear.load_range}
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{tireRear?.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {tireRear?.speed_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Speed: {tireRear.speed_rating}</span>}
                    {tireRear?.load_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Load: {tireRear.load_rating}</span>}
                    {tireRear?.part_number && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Part# {tireRear.part_number}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700' }}>Qty: {p?.quantity_rear || 2}</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#6b21a8', lineHeight: 1 }}>{formatCurrency(p?.price_per_tire_rear)}</div>
                  <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>per tire</div>
                </div>
              </div>
            </>
          ) : !isStaggered && !quote.alternatives ? (
            // ===== STANDARD, NO ALTERNATIVES: Compact standalone card =====
            <div style={{ border: '2px solid #cbd5e1', borderLeft: '5px solid #8b1538', borderRadius: '10px', padding: '14px 20px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '700', letterSpacing: '1px', marginBottom: '2px' }}>
                  {tire?.brand} • {tire?.size} {tire?.load_range && tire.load_range}
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{tire?.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {tire?.speed_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Speed: {tire.speed_rating}</span>}
                  {tire?.load_rating && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Load: {tire.load_rating}</span>}
                  {tire?.part_number && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>Part# {tire.part_number}</span>}
                  {tire?.warranty_miles && <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '16px', fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>✓ {parseInt(tire.warranty_miles).toLocaleString()} mi</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '700' }}>Qty: {p?.quantity}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b1538', lineHeight: 1 }}>{formatCurrency(p?.price_per_tire)}</div>
                <div style={{ fontSize: '10px', color: '#1e293b', fontWeight: '600' }}>per tire</div>
              </div>
            </div>
          ) : null}

          {/* ─── Promo Badge (if applicable) ─── */}
          {p?.promo_discount > 0 && (
            <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '8px', padding: '10px 16px', textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#166534', fontWeight: '700', marginBottom: '2px' }}>
                {p?.promo_name || 'Promotion Applied'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                You're saving {formatCurrency(p?.promo_discount)}
              </div>
            </div>
          )}

          {/* ─── Tread + Pricing Side by Side ─── */}
          <div className="tread-pricing-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
            
            {/* LEFT: Tread Condition */}
            <div className="tread-column">
              {treadData && (
                <>
                  <div style={sectionLabel}>CURRENT TIRE CONDITION</div>
                  <TreadDiagram treadData={treadData} replacementReasons={quote.tire_replacement_reasons} />
                </>
              )}
            </div>

            {/* RIGHT: Pricing */}
            <div className="pricing-column">
              <div style={sectionLabel}>PRICING</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {isStaggered ? (
                    // Staggered: separate front/rear tire line items
                    <>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>▲ Front Tires ({formatCurrency(p?.price_per_tire)} × {p?.quantity_front || 2})</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency((p?.price_per_tire || 0) * (p?.quantity_front || 2))}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>▼ Rear Tires ({formatCurrency(p?.price_per_tire_rear)} × {p?.quantity_rear || 2})</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_tires_rear || 0)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>Tires ({formatCurrency(p?.price_per_tire)} × {p?.quantity})</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{formatCurrency(p?.subtotal_tires)}</td>
                    </tr>
                  )}
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
                  {nexenRebate && (
                    <>
                      <tr>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>
                          🏷️ {nexenRebate.label}
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>
                          -{formatCurrency(nexenRebate.amount)}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <td style={{ padding: '10px 4px', fontSize: '14px', fontWeight: '700', color: '#16a34a', borderBottom: 'none' }}>YOUR PRICE AFTER REBATE</td>
                        <td style={{ padding: '10px 4px', textAlign: 'right', fontSize: '18px', fontWeight: '700', color: '#16a34a', borderBottom: 'none' }}>{formatCurrency((p?.total_amount || 0) - nexenRebate.amount)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              
              {!isStaggered && (
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>
                That's just <strong style={{ color: '#8b1538', fontSize: '17px' }}>{formatCurrency(p?.per_tire_installed)}</strong> per tire installed!
              </div>
              )}

              {/* Nexen rebate submission callout */}
              {nexenRebate && (
                <div style={{
                  marginTop: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '22px', lineHeight: 1 }}>🏷️</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '2px' }}>
                      Claim Your Nexen Rebate
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>
                      Get {formatCurrency(nexenRebate.amount)} back after purchase · {nexenRebate.validText}
                    </div>
                    {nexenRebate.url && (
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        <a
                          href={nexenRebate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#15803d', fontWeight: '700', textDecoration: 'underline' }}
                        >
                          {nexenRebate.url.replace('https://', '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Message */}
          {actionMessage && (
            <div data-print-hide="true" style={{
              padding: '12px 20px', borderRadius: '8px', marginBottom: '16px',
              backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : actionMessage.type === 'warning' ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : actionMessage.type === 'warning' ? '#fde68a' : '#fecaca'}`,
              color: actionMessage.type === 'success' ? '#166534' : actionMessage.type === 'warning' ? '#92400e' : '#991b1b',
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

          {/* ─── Staff Buttons (hidden for customers) ─── */}
          {isStaff && (
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
          )}

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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>LICENSE PLATE</label>
                    <input
                      value={editCustomer.license_plate || ''}
                      onChange={(e) => setEditCustomer({...editCustomer, license_plate: e.target.value.toUpperCase()})}
                      placeholder="e.g. 8ABC123"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ width: '72px' }}>
                    <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>STATE</label>
                    <select
                      value={editCustomer.license_state || 'CA'}
                      onChange={(e) => setEditCustomer({...editCustomer, license_state: e.target.value})}
                      style={{ width: '100%', padding: '8px 4px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                    >
                      {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
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

              {/* Tread Depth Editing + Replacement Reasons */}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e9d5f5' }}>
                <label style={{ fontSize: '9px', color: '#1e293b', fontWeight: '700', display: 'block', marginBottom: '8px', textAlign: 'center' }}>TREAD DEPTHS (32nds) & TIRE CONDITIONS</label>
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
                      {/* Replacement Reasons Toggle */}
                      <div style={{ marginTop: '6px', borderTop: '1px solid #e0d0f0', paddingTop: '5px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '10px', color: editReasons[key].length > 0 ? '#dc2626' : '#1e293b', fontWeight: '600' }}>
                          <input type="checkbox"
                            checked={editReasons[key].length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditReasons(prev => ({ ...prev, [key]: ['_pending'] }));
                              } else {
                                setEditReasons(prev => ({ ...prev, [key]: [] }));
                              }
                            }}
                            style={{ width: '14px', height: '14px', accentColor: '#dc2626' }}
                          />
                          ⚠️ Issues
                        </label>
                        {editReasons[key].length > 0 && (
                          <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto', fontSize: '9px' }}>
                            {REPLACEMENT_REASON_OPTIONS.map(opt => (
                              <label key={opt.code} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0', cursor: 'pointer', color: '#1e293b' }}>
                                <input type="checkbox"
                                  checked={editReasons[key].includes(opt.code)}
                                  onChange={(e) => {
                                    setEditReasons(prev => {
                                      const current = prev[key].filter(r => r !== '_pending');
                                      return {
                                        ...prev,
                                        [key]: e.target.checked
                                          ? [...current, opt.code]
                                          : current.filter(r => r !== opt.code)
                                      };
                                    });
                                  }}
                                  style={{ width: '12px', height: '12px', accentColor: '#dc2626', flexShrink: 0 }}
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        )}
                        {editReasons[key].filter(r => r !== '_pending').length > 0 && (
                          <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {editReasons[key].filter(r => r !== '_pending').map(code => {
                              const opt = REPLACEMENT_REASON_OPTIONS.find(o => o.code === code);
                              return (
                                <span key={code} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '1px 5px', fontSize: '8px', color: '#dc2626', fontWeight: '600' }}>
                                  {(opt?.label || code).split('/')[0].split('(')[0].trim()}
                                  <span onClick={() => setEditReasons(prev => ({ ...prev, [key]: prev[key].filter(r => r !== code) }))}
                                    style={{ marginLeft: '3px', cursor: 'pointer', fontWeight: '700' }}>×</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Compare Your Options (hidden for staggered) ─── */}
          {!isStaggered && quote.alternatives && (
            <div className="comparison-card" style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionLabel, textAlign: 'center' }}>COMPARE YOUR OPTIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: quote.alternatives.good && quote.alternatives.best ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                {/* Good */}
                {quote.alternatives.good && (
                  <div style={{ border: '2px solid #86efac', borderRadius: '10px', padding: '16px 12px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', letterSpacing: '1.5px', marginBottom: '8px' }}>ECONOMY</div>
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
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#8b1538', letterSpacing: '1.5px', marginBottom: '4px', marginTop: '4px' }}>BEST VALUE</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '1px' }}>{tire?.brand}</div>
                  <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '500', marginBottom: '3px' }}>{tire?.name}</div>
                  <div style={{ fontSize: '9.5px', color: '#666', marginBottom: '4px' }}>
                    {tire?.size}{tire?.speed_rating ? ` • Speed: ${tire.speed_rating}` : ''}{tire?.load_rating ? ` • Load: ${tire.load_rating}` : ''}
                    {tire?.part_number ? ` • Part# ${tire.part_number}` : ''}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b1538', marginBottom: '2px' }}>
                    {formatCurrency(p?.price_per_tire)}<span style={{ fontSize: '10px', fontWeight: '500', color: '#1e293b' }}>/tire × {p?.quantity}</span>
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
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', letterSpacing: '1.5px', marginBottom: '8px' }}>PREMIUM</div>
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

          {/* Warranty Disclaimer - always shown */}
            <div className="warranty-disclaimer" style={{
              backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px',
              padding: '10px 14px', marginBottom: '14px', fontSize: '10.5px', color: '#1e293b', lineHeight: '1.5', fontWeight: '500'
            }}>
              <strong>Tread Wear Warranty Note:</strong> Tire treadwear warranties are not "free replacement" warranties. 
              They are generally prorated discounts based on how early the tires wore out compared to their promised lifespan. 
              Manufacturer's require proof of tire rotations based on the vehicle OEM's schedule and correct vehicle alignment. 
              Road hazards, abuse and neglect are not covered.
            </div>

          {/* Call to Action */}
          {quote.created_by?.display_name && (
            <div style={{ textAlign: 'center', padding: '12px 16px', margin: '12px 0 0 0', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
                When you're ready to get your new tires, ask for {quote.created_by.display_name}
                {store?.phone_formatted ? ` — call us at ${store.phone_formatted}` : ''} or schedule online!
              </p>
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
            margin: 0.25in;
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
          
          /* CRITICAL: Allow content to flow — do NOT blanket prevent breaks on all divs.
             Only prevent breaks on specific elements that should stay together. */
          
          [data-print-hide="true"] { display: none !important; }
          .no-print { display: none !important; }
          button { display: none !important; }
          div { box-shadow: none !important; }
          a[href]:after { content: none !important; }
          
          /* ── Outer container ── */
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
          }
          
          /* ── Header — compact, NO page break after ── */
          .quote-header {
            padding: 8px 14px !important;
            border-top-width: 4px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          
          .quote-header img { height: 26px !important; }
          
          /* ── Content — NO page break before ── */
          .quote-content {
            padding: 10px 14px !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          
          /* ── Customer/Vehicle row ── */
          .info-row {
            margin-bottom: 8px !important;
            padding-bottom: 6px !important;
            gap: 12px !important;
          }
          
          /* ── Tread + Pricing side by side ── */
          .tread-pricing-row {
            gap: 12px !important;
            margin-bottom: 8px !important;
          }
          
          /* ── Comparison card — keep together ── */
          .comparison-card {
            margin-bottom: 6px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* ── Warranty disclaimer ── */
          .warranty-disclaimer {
            padding: 4px 8px !important;
            font-size: 7.5px !important;
            margin-bottom: 4px !important;
            line-height: 1.3 !important;
          }
          
          /* ── Footer ── */
          .quote-footer {
            padding-top: 4px !important;
            font-size: 8px !important;
            page-break-before: avoid !important;
          }
          
          .quote-footer p {
            margin: 1px 0 !important;
          }
          
          /* ══════════════════════════════════════
             GLOBAL TEXT SIZE COMPACTION FOR PRINT
             ══════════════════════════════════════ */
          
          /* Section labels */
          .info-row [style*="letterSpacing"],
          .tread-column [style*="letterSpacing"],
          .pricing-column [style*="letterSpacing"],
          .comparison-card [style*="letterSpacing"] {
            font-size: 8px !important;
            margin-bottom: 4px !important;
          }
          
          /* Customer name */
          .info-row [style*="fontSize: '17px'"],
          .info-row [style*="font-size: 17px"] {
            font-size: 13px !important;
          }
          
          /* Customer details, vehicle */
          .info-row [style*="fontSize: '13px'"],
          .info-row [style*="fontSize: '16px'"],
          .info-row [style*="fontSize: '11.5px'"] {
            font-size: 10px !important;
          }
          
          /* Tire card */
          .quote-content > div:nth-child(2) {
            padding: 10px 14px !important;
            margin-bottom: 6px !important;
          }
          
          /* Tire card name */
          h3 {
            font-size: 14px !important;
            margin-bottom: 4px !important;
          }
          
          /* Tire card price */
          [style*="fontSize: '32px'"],
          [style*="font-size: 32px"] {
            font-size: 22px !important;
          }
          
          /* Spec badges */
          [style*="borderRadius: '20px'"],
          [style*="border-radius: 20px"] {
            font-size: 8.5px !important;
            padding: 1px 6px !important;
          }
          
          /* Warranty + Promo row */
          .quote-content > div:nth-child(3) {
            margin-bottom: 8px !important;
            gap: 6px !important;
          }
          
          /* Promo amount */
          [style*="fontSize: '20px'"][style*="color: '#16a34a'"] {
            font-size: 14px !important;
          }
          
          /* Tread tiles */
          [style*="fontSize: '22px'"][style*="fontWeight: '700'"][style*="lineHeight"] {
            font-size: 16px !important;
          }
          
          /* Stopping distance bars */
          [style*="height: '14px'"] {
            height: 10px !important;
          }
          
          /* Stopping distance callout */
          [style*="fontSize: '11.5px'"][style*="backgroundColor: '#fef3c7'"] {
            font-size: 9px !important;
            padding: 4px 8px !important;
          }
          
          /* Pricing table */
          table td {
            padding: 3px 0 !important;
            font-size: 10px !important;
          }
          
          /* Pricing total row */
          [style*="backgroundColor: '#f8fafc'"] td {
            padding: 5px 3px !important;
          }
          
          [style*="fontSize: '16px'"][style*="fontWeight: '700'"][style*="color: '#1e293b'"] {
            font-size: 12px !important;
          }
          
          [style*="fontSize: '22px'"][style*="color: '#8b1538'"] {
            font-size: 16px !important;
          }
          
          /* Per tire callout */
          [style*="fontSize: '17px'"][style*="color: '#8b1538'"] {
            font-size: 13px !important;
          }
          
          /* Compare cards */
          .comparison-card [style*="fontSize: '14px'"][style*="fontWeight: '700'"] {
            font-size: 10px !important;
          }
          
          .comparison-card [style*="fontSize: '20px'"] {
            font-size: 14px !important;
          }
          
          .comparison-card [style*="fontSize: '18px'"] {
            font-size: 13px !important;
          }
          
          .comparison-card [style*="fontSize: '11px'"],
          .comparison-card [style*="fontSize: '10.5px'"],
          .comparison-card [style*="fontSize: '9px'"] {
            font-size: 8px !important;
          }
          
          .comparison-card [style*="padding: '16px"] {
            padding: 8px 6px !important;
          }
          
          .comparison-card [style*="gap: '12px'"] {
            gap: 6px !important;
          }
          
          /* Recommended badge */
          .comparison-card [style*="position: 'absolute'"] {
            font-size: 7px !important;
            padding: 1px 8px !important;
            top: -7px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuoteView;
