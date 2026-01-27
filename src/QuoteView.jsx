// =============================================================================
// QUOTE VIEW - Customer-Facing Quote Display v2
// =============================================================================
// Route: #/quote/:code
// Updated: 2026-01-27
// Features:
//   - Proper car image (from Supabase storage)
//   - No emoji car - text only vehicle display
//   - "Vehicle Not Verified" when no YMM
//   - Stopping distance visual comparison
//   - Disposal fee + CA state fee display
//   - FET if applicable
//   - Warranty disclaimer
//   - Email/Text/Pay buttons
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

  const { lf, rf, lr, rr } = treadData;

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
      {treadData.stopping_distance_current && (
        <StoppingDistanceChart 
          currentDistance={treadData.stopping_distance_current} 
          newDistance={treadData.stopping_distance_new || 195} 
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
  const [actionMessage, setActionMessage] = useState(null);

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

  const handleTextQuote = async () => {
    const phone = quote?.customer?.phone || prompt('Enter phone number:');
    if (!phone) return;
    
    setSendingSms(true);
    setActionMessage(null);
    try {
      const response = await fetch(`${API_BASE}/sms-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          quote_id: quote.quote_id,
          phone_override: phone !== quote?.customer?.phone ? phone : null
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

  const handlePayOnline = () => {
    // PayPal.me link with amount
    const amount = quote?.pricing?.total_amount || 0;
    const paypalUrl = `https://paypal.me/jiffysean/${amount.toFixed(2)}`;
    window.open(paypalUrl, '_blank');
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
    <div style={{ 
      fontFamily: "'Segoe UI', sans-serif", 
      backgroundColor: '#f1f5f9', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ 
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
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          
          {/* Customer & Vehicle Row */}
          <div style={{ 
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
            <div style={{
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

          {/* Action Buttons */}
          <div style={{ 
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
                  padding: '14px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📅 SCHEDULE
              </a>
            )}
            {store?.phone && (
              <a 
                href={`tel:${store.phone}`}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '2px solid #e2e8f0'
                }}
              >
                📞 CALL
              </a>
            )}
            <button
              onClick={handleEmailQuote}
              disabled={sendingEmail}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: sendingEmail ? 'not-allowed' : 'pointer',
                opacity: sendingEmail ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {sendingEmail ? '...' : '✉️ EMAIL'}
            </button>
            <button
              onClick={handleTextQuote}
              disabled={sendingSms}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: sendingSms ? 'not-allowed' : 'pointer',
                opacity: sendingSms ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {sendingSms ? '...' : '💬 TEXT'}
            </button>
            <button
              onClick={handlePayOnline}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              💳 PAY ONLINE
            </button>
          </div>

          {/* Warranty Disclaimer */}
          {tire?.warranty_miles && (
            <div style={{
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

          {/* Footer */}
          <div style={{ 
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          div { box-shadow: none !important; }
          a[href]:after { content: none !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default QuoteView;
