import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

const getTreadColor = (status) => {
  switch (status) {
    case 'good': return '#27ae60';
    case 'attention': return '#f1c40f';
    case 'replace': return '#e74c3c';
    default: return '#999';
  }
};

const getTreadLabel = (status) => {
  switch (status) {
    case 'good': return 'GOOD';
    case 'attention': return 'NEEDS ATTENTION';
    case 'replace': return 'REPLACE NOW';
    default: return '';
  }
};

const getValueColor = (val) => {
  if (val === null || val === undefined) return '#999';
  if (val >= 6) return '#27ae60';
  if (val === 5) return '#f1c40f';
  return '#e74c3c';
};

// Mini tread value display
const TreadValue = ({ value }) => {
  const color = getValueColor(value);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '700',
      color: color,
      backgroundColor: color + '20',
      minWidth: '24px',
      textAlign: 'center'
    }}>
      {value ?? '-'}
    </span>
  );
};

// Tire tread display block (3 values)
const TireTreadDisplay = ({ label, data }) => {
  if (!data) return null;
  
  return (
    <div style={{ textAlign: 'center', padding: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#666', marginBottom: '4px', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#999' }}>IN</div>
          <TreadValue value={data.inside} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#999' }}>MID</div>
          <TreadValue value={data.middle} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8px', color: '#999' }}>OUT</div>
          <TreadValue value={data.outside} />
        </div>
      </div>
    </div>
  );
};

// Full 12-reading tread diagram with car
const FullTreadDiagram = ({ tread }) => {
  const statusColor = getTreadColor(tread.status);
  
  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      borderRadius: '12px', 
      padding: '20px',
      border: `2px solid ${statusColor}20`
    }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#666', letterSpacing: '1px' }}>
          CURRENT TREAD DEPTH (32nds of an inch)
        </span>
      </div>
      
      {/* Car diagram with tread readings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        {/* Left side - FL and RL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <TireTreadDisplay label="FRONT LEFT" data={tread.front_left} />
          <TireTreadDisplay label="REAR LEFT" data={tread.rear_left} />
        </div>

        {/* Center - Car Image */}
        <div style={{ padding: '0 10px' }}>
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/Vehicle-image.png"
            alt="Vehicle"
            style={{ width: '100px', opacity: 0.7 }}
          />
        </div>

        {/* Right side - FR and RR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <TireTreadDisplay label="FRONT RIGHT" data={tread.front_right} />
          <TireTreadDisplay label="REAR RIGHT" data={tread.rear_right} />
        </div>
      </div>

      {/* Status summary */}
      <div style={{ 
        backgroundColor: statusColor + '15', 
        border: `2px solid ${statusColor}`,
        borderRadius: '8px',
        padding: '12px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: '700', color: statusColor }}>
            {tread.lowest}/32"
          </span>
          <span style={{ 
            marginLeft: '10px', 
            fontSize: '12px', 
            fontWeight: '700', 
            color: statusColor,
            backgroundColor: statusColor + '20',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {getTreadLabel(tread.status)}
          </span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>
          <div>Your stopping: <strong>~{tread.stopping_distance_ft || 350}ft</strong></div>
          <div>New tires: <strong>~{tread.new_tire_stopping_distance_ft || 220}ft</strong></div>
          <div style={{ fontSize: '9px', color: '#999' }}>(at 60mph, wet)</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '9px', color: '#888' }}>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#27ae60', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>6+ Good</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f1c40f', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>5 Attention</span>
        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#e74c3c', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>&lt;5 Replace</span>
      </div>
    </div>
  );
};

// Legacy 3-reading tread display
const LegacyTreadDisplay = ({ tread }) => {
  const statusColor = getTreadColor(tread.status);
  
  return (
    <div style={{ 
      backgroundColor: statusColor + '10', 
      border: `2px solid ${statusColor}`,
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>Current Tread Depth</div>
          <span style={{ fontSize: '28px', fontWeight: '700', color: statusColor }}>
            {tread.lowest}/32"
          </span>
          <span style={{ 
            marginLeft: '10px', 
            fontSize: '12px', 
            fontWeight: '700', 
            color: statusColor,
            backgroundColor: statusColor + '20',
            padding: '4px 12px',
            borderRadius: '12px'
          }}>
            {getTreadLabel(tread.status)}
          </span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
          <div>Your stopping: <strong>~{tread.stopping_distance_ft || 350}ft</strong></div>
          <div>New tires: <strong>~{tread.new_tire_stopping_distance_ft || 220}ft</strong></div>
        </div>
      </div>
      {(tread.inside || tread.middle || tread.outside) && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${statusColor}30`, display: 'flex', gap: '15px', fontSize: '12px', color: '#666' }}>
          {tread.inside !== null && <span>Inside: <strong>{tread.inside}/32"</strong></span>}
          {tread.middle !== null && <span>Middle: <strong>{tread.middle}/32"</strong></span>}
          {tread.outside !== null && <span>Outside: <strong>{tread.outside}/32"</strong></span>}
        </div>
      )}
    </div>
  );
};

export default function QuoteView() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
      // Get shortcode from URL hash: #/quote/ABC123
      const hash = window.location.hash;
      const match = hash.match(/\/quote\/([A-Za-z0-9]+)/);
      
      if (!match) {
        setError('Invalid quote URL');
        setLoading(false);
        return;
      }

      const shortCode = match[1];

      try {
        const response = await fetch(`${API_BASE}/get-quote?code=${shortCode}&key=${API_KEY}`);
        const data = await response.json();

        if (data.success) {
          setQuote(data.quote);
        } else {
          setError(data.error || 'Quote not found');
        }
      } catch (e) {
        setError('Failed to load quote');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <p style={{ color: '#666' }}>Loading quote...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>😕</div>
          <h2 style={{ color: '#e74c3c', marginBottom: '10px' }}>Quote Not Found</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
          <a href="#/" style={{ color: '#9b59b6', textDecoration: 'none', fontWeight: '600' }}>← Back to Tire Finder</a>
        </div>
      </div>
    );
  }

  // Expired state
  if (quote.is_expired) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏰</div>
          <h2 style={{ color: '#e67e22', marginBottom: '10px' }}>Quote Expired</h2>
          <p style={{ color: '#666', marginBottom: '10px' }}>This quote expired on {new Date(quote.expires_at).toLocaleDateString()}.</p>
          <p style={{ color: '#666', marginBottom: '20px' }}>Please contact the store for an updated quote.</p>
          <p style={{ color: '#999', fontSize: '13px' }}>Store: {quote.store?.name}</p>
        </div>
      </div>
    );
  }

  // Main quote view
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '20px' }}>
        <div className="print-container" style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', color: 'white', padding: '25px', textAlign: 'center' }}>
            <img 
              src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzwhite.png" 
              alt="Jiffy Lube Multicare" 
              style={{ height: '40px', marginBottom: '15px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '700' }}>Your Tire Quote</h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Quote #{quote.quote_number}</p>
          </div>

          {/* Content */}
          <div style={{ padding: '25px' }}>
            
            {/* Customer & Store Info */}
            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              <p style={{ margin: '5px 0', fontSize: '15px' }}>
                <strong>Prepared for:</strong> {quote.customer?.full_name || 'Valued Customer'}
              </p>
              {quote.vehicle?.display && (
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                  <strong>Vehicle:</strong> {quote.vehicle.display}
                </p>
              )}
              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                <strong>Store:</strong> Jiffy Lube {quote.store?.name} (#{quote.store?.id})
              </p>
              <p style={{ margin: '5px 0', color: '#999', fontSize: '12px' }}>
                Valid until: {new Date(quote.expires_at).toLocaleDateString()}
              </p>
            </div>

            {/* Tread Depth Section */}
            {quote.tread && (
              <div style={{ marginBottom: '20px' }}>
                {quote.tread.has_full_readings ? (
                  <FullTreadDiagram tread={quote.tread} />
                ) : (
                  <LegacyTreadDisplay tread={quote.tread} />
                )}
              </div>
            )}

            {/* Tire Info */}
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '18px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>
                {quote.tire?.brand} {quote.tire?.name}
              </h3>
              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                Size: <strong>{quote.tire?.size}</strong> &nbsp;|&nbsp; Part#: {quote.tire?.part_number}
              </p>
              {quote.tire?.warranty_miles && (
                <p style={{ margin: '8px 0 0 0', color: '#27ae60', fontSize: '13px', fontWeight: '600' }}>
                  ✓ {quote.tire.warranty_miles.toLocaleString()} Mile Tread Warranty
                </p>
              )}
            </div>

            {/* Pricing Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 0' }}>Tires ({formatCurrency(quote.pricing?.price_per_tire)} × {quote.pricing?.quantity})</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(quote.pricing?.subtotal_tires)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 0' }}>Mount & Balance ({formatCurrency(quote.pricing?.mount_balance_per_tire)} × {quote.pricing?.quantity})</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(quote.pricing?.subtotal_mount_balance)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 0' }}>Road Hazard Protection ({formatCurrency(quote.pricing?.road_hazard_per_tire)} × {quote.pricing?.quantity})</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(quote.pricing?.subtotal_road_hazard)}</td>
                </tr>
                {quote.pricing?.subtotal_fet > 0 && (
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 0' }}>Federal Excise Tax</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(quote.pricing?.subtotal_fet)}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 0' }}>Sales Tax ({(quote.pricing?.tax_rate * 100).toFixed(2)}%)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{formatCurrency(quote.pricing?.tax_amount)}</td>
                </tr>
                {quote.pricing?.promo_discount > 0 && (
                  <tr style={{ borderBottom: '1px solid #eee', color: '#27ae60' }}>
                    <td style={{ padding: '10px 0' }}>Promo: {quote.pricing?.promo_name}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>-{formatCurrency(quote.pricing?.promo_discount)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: '#9b59b6', color: 'white' }}>
                  <td style={{ padding: '15px 10px', fontWeight: '700', fontSize: '16px', borderRadius: '0 0 0 8px' }}>Total</td>
                  <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: '700', fontSize: '20px', borderRadius: '0 0 8px 0' }}>
                    {formatCurrency(quote.pricing?.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Per Tire Installed */}
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '12px', backgroundColor: '#f0ebf8', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Per Tire Installed: </span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#9b59b6' }}>{formatCurrency(quote.pricing?.per_tire_installed)}</span>
            </div>

            {/* Rebate Section */}
            {quote.pricing?.rebate_amount > 0 && (
              <div style={{ backgroundColor: '#d4edda', border: '1px solid #28a745', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#155724' }}>After {quote.pricing?.rebate_description || 'Rebate'}:</strong>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#155724' }}>
                    {formatCurrency(quote.pricing?.total_after_rebate)}
                  </div>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#155724' }}>
                  *Rebate of {formatCurrency(quote.pricing?.rebate_amount)} applied after purchase via mail-in or online submission
                </p>
              </div>
            )}

            {/* Call to Action */}
            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '600', color: '#856404' }}>
                Ready to schedule your tire installation?
              </p>
              <p style={{ margin: '0', color: '#856404', fontSize: '14px' }}>
                Call or visit <strong>Jiffy Lube {quote.store?.name}</strong>
              </p>
            </div>

            {/* Print Button */}
            <div className="no-print" style={{ textAlign: 'center' }}>
              <button 
                onClick={handlePrint}
                style={{
                  backgroundColor: '#9b59b6',
                  color: 'white',
                  border: 'none',
                  padding: '14px 40px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)'
                }}
              >
                🖨️ Print This Quote
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px 25px', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '11px', color: '#999' }}>
              Quote #{quote.quote_number} • Created by {quote.created_by?.username} • {new Date(quote.created_at).toLocaleDateString()}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
              tires.myjiffylube.ai
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
