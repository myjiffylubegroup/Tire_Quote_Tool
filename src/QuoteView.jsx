// =============================================================================
// QUOTE VIEW - Customer-Facing Quote Display v2
// =============================================================================
// Route: #/quote/:code
// Displays quote with JL branding, per-tire tread status, store info
// Updated: 2026-01-27
// =============================================================================

import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';
const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

// Tread status thresholds: 0-4 red, 5-6 yellow, 7+ green
const getTreadInfo = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth <= 4) return { status: 'replace', color: '#dc2626', bgColor: '#fef2f2', label: 'REPLACE NOW' };
  if (depth <= 6) return { status: 'consider', color: '#d97706', bgColor: '#fffbeb', label: 'CONSIDER REPLACEMENT' };
  return { status: 'good', color: '#16a34a', bgColor: '#f0fdf4', label: 'GOOD' };
};

// Format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Format phone: 8059221948 -> (805) 922-1948
const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

// Format date
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
      minWidth: '80px'
    }}>
      <div style={{ fontSize: '10px', color: '#666', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: info.color }}>{data.lowest}<span style={{ fontSize: '12px' }}>/32</span></div>
      <div style={{ fontSize: '9px', color: info.color, fontWeight: '600' }}>{info.label}</div>
    </div>
  );
};

// Car diagram with tread readings - car facing LEFT, viewed from above
const CarTreadDiagram = ({ treadData }) => {
  if (!treadData) return null;

  const { lf, rf, lr, rr } = treadData;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '10px',
      padding: '20px',
      backgroundColor: '#f8fafc',
      borderRadius: '12px'
    }}>
      {/* Car orientation label */}
      <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>← FRONT OF VEHICLE</div>
      
      {/* Main diagram container */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        
        {/* Passenger side (top when car faces left) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <TireTreadBadge label="PASS FRONT" position="rf" data={rf} />
          <TireTreadBadge label="PASS REAR" position="rr" data={rr} />
        </div>

        {/* Car body representation */}
        <div style={{
          width: '120px',
          height: '200px',
          backgroundColor: '#e2e8f0',
          borderRadius: '20px 60px 60px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Hood indicator */}
          <div style={{
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '60px',
            backgroundColor: '#cbd5e1',
            borderRadius: '10px 0 0 10px'
          }} />
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>VEHICLE</span>
        </div>

        {/* Driver side (bottom when car faces left) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <TireTreadBadge label="DRIVER FRONT" position="lf" data={lf} />
          <TireTreadBadge label="DRIVER REAR" position="lr" data={lr} />
        </div>
      </div>

      {/* Summary */}
      {treadData.summary && (
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginTop: '10px',
          fontSize: '12px'
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
    </div>
  );
};

// Main QuoteView Component
const QuoteView = () => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get short code from URL hash
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
  const overallTreadInfo = quote.tread ? getTreadInfo(quote.tread.lowest) : null;

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
        
        {/* Header with JL Logo and Store Info */}
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
              <h4 style={{ 
                margin: '0 0 12px 0', 
                color: '#64748b', 
                fontSize: '11px', 
                fontWeight: '700', 
                letterSpacing: '1px' 
              }}>PREPARED FOR</h4>
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
            {quote.vehicle?.display && (
              <div>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  color: '#64748b', 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  letterSpacing: '1px' 
                }}>VEHICLE</h4>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  🚗 {quote.vehicle.display}
                </div>
                {customer?.license_plate && (
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
                    Plate: {customer.license_plate} ({customer.license_state || 'CA'})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tread Depth Section */}
          {treadData && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ 
                margin: '0 0 15px 0', 
                color: '#64748b', 
                fontSize: '11px', 
                fontWeight: '700', 
                letterSpacing: '1px' 
              }}>CURRENT TIRE CONDITION</h4>
              <CarTreadDiagram treadData={treadData} />
            </div>
          )}

          {/* Recommended Tire */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ 
              margin: '0 0 15px 0', 
              color: '#64748b', 
              fontSize: '11px', 
              fontWeight: '700', 
              letterSpacing: '1px' 
            }}>RECOMMENDED TIRES</h4>
            <div style={{ 
              backgroundColor: '#8b1538', 
              borderRadius: '10px', 
              padding: '20px 25px', 
              color: 'white' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>
                    {quote.tire?.brand} {quote.tire?.name}
                  </h3>
                  <p style={{ margin: '0', opacity: 0.9, fontSize: '14px' }}>
                    {quote.tire?.size} • Part# {quote.tire?.part_number}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {quote.tire?.warranty_miles && (
                      <span style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '15px', 
                        fontSize: '12px' 
                      }}>
                        ✓ {parseInt(quote.tire.warranty_miles).toLocaleString()} Mile Warranty
                      </span>
                    )}
                    {quote.tire?.speed_rating && (
                      <span style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '15px', 
                        fontSize: '12px' 
                      }}>
                        Speed: {quote.tire.speed_rating}
                      </span>
                    )}
                    {quote.tire?.load_rating && (
                      <span style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '15px', 
                        fontSize: '12px' 
                      }}>
                        Load: {quote.tire.load_rating}
                      </span>
                    )}
                    {quote.tire?.snowflake && (
                      <span style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '15px', 
                        fontSize: '12px' 
                      }}>
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
          </div>

          {/* Pricing Breakdown */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ 
              margin: '0 0 15px 0', 
              color: '#64748b', 
              fontSize: '11px', 
              fontWeight: '700', 
              letterSpacing: '1px' 
            }}>PRICING</h4>
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
                {p?.subtotal_fet > 0 && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#334155' }}>
                      Federal Excise Tax
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
                    Sales Tax ({(p?.tax_rate * 100).toFixed(2)}%)
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

          {/* Call to Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
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
                  padding: '15px 30px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
              >
                📅 SCHEDULE APPOINTMENT
              </a>
            )}
            {store?.phone && (
              <a 
                href={`tel:${store.phone}`}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '2px solid #e2e8f0'
                }}
              >
                📞 CALL {store.phone_formatted || formatPhone(store.phone)}
              </a>
            )}
          </div>

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
        }
      `}</style>
    </div>
  );
};

export default QuoteView;
