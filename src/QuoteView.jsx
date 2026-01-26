import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const getTreadInfo = (status) => {
  const map = { 'good': { label: 'GOOD', color: '#27ae60' }, 'attention': { label: 'NEEDS ATTENTION', color: '#f1c40f' }, 'replace': { label: 'REPLACE NOW', color: '#e74c3c' } };
  return map[status] || { label: 'UNKNOWN', color: '#666' };
};

export default function QuoteView({ code }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    fetch(`${API_BASE}/get-quote?code=${code}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setQuote(data.quote); else setError(data.error || 'Quote not found'); })
      .catch(() => setError('Failed to load quote'))
      .finally(() => setLoading(false));
  }, [code]);

  const handlePrint = () => window.print();

  const handleEmail = async () => {
    const email = quote?.customer?.email || prompt('Enter email address:');
    if (!email) return;
    try {
      const res = await fetch(`${API_BASE}/email-quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: API_KEY, short_code: code, email_override: email !== quote?.customer?.email ? email : null }) });
      const data = await res.json();
      alert(data.success ? `Quote emailed to ${data.emailed_to}` : 'Failed: ' + (data.error || 'Unknown error'));
    } catch { alert('Failed to send email'); }
  };

  if (loading) return <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', backgroundColor: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#9b59b6' }}>Loading quote...</p></div>;
  
  if (error) return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', backgroundColor: '#f5f6fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
        <div style={{ fontSize: '50px', marginBottom: '15px' }}>❌</div>
        <h2 style={{ color: '#e74c3c', marginBottom: '15px' }}>Quote Not Found</h2>
        <p style={{ color: '#666', marginBottom: '25px' }}>{error}</p>
        <a href="#/" style={{ backgroundColor: '#9b59b6', color: 'white', padding: '12px 30px', borderRadius: '25px', textDecoration: 'none', fontWeight: '600' }}>Go to Tire Finder</a>
      </div>
    </div>
  );

  const treadInfo = quote.tread ? getTreadInfo(quote.tread.status) : null;
  const p = quote.pricing;

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
      
      <header className="no-print" style={{ backgroundColor: '#cc0000', padding: '15px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-logo-white.png" alt="Jiffy Lube" style={{ height: '35px' }} />
            <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>TIRE QUOTE</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handlePrint} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Print</button>
            <button onClick={handleEmail} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>📧 Email</button>
            <a href="#/" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>← Back</a>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <div style={{ background: 'linear-gradient(135deg, #cc0000 0%, #990000 100%)', color: 'white', padding: '25px 30px', textAlign: 'center' }}>
            <img src="https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-logo-white.png" alt="Jiffy Lube" style={{ height: '40px', marginBottom: '15px' }} />
            <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>Tire Quote</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>#{quote.quote_number}</p>
            {quote.is_expired && <div style={{ backgroundColor: '#e74c3c', display: 'inline-block', padding: '5px 15px', borderRadius: '15px', marginTop: '10px', fontSize: '12px', fontWeight: '700' }}>⚠️ EXPIRED</div>}
          </div>

          <div style={{ padding: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #eee' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>PREPARED FOR</h4>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{quote.customer?.full_name || 'Valued Customer'}</p>
                {quote.customer?.phone && <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>📞 {quote.customer.phone}</p>}
                {quote.customer?.email && <p style={{ margin: '3px 0 0 0', color: '#666', fontSize: '13px' }}>✉️ {quote.customer.email}</p>}
              </div>
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>LOCATION</h4>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Jiffy Lube #{quote.store?.id}</p>
                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>{quote.store?.name}</p>
              </div>
              {quote.vehicle?.display && <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>VEHICLE</h4>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>🚗 {quote.vehicle.display}</p>
              </div>}
            </div>

            {treadInfo && quote.tread && (
              <div style={{ backgroundColor: treadInfo.color + '15', border: `2px solid ${treadInfo.color}`, borderRadius: '10px', padding: '20px', marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: treadInfo.color, fontSize: '14px', fontWeight: '700' }}>⚠️ YOUR CURRENT TIRE CONDITION</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <span style={{ fontSize: '28px', fontWeight: '700', color: treadInfo.color }}>{quote.tread.lowest}/32"</span>
                    <span style={{ marginLeft: '15px', fontSize: '14px', fontWeight: '700', color: treadInfo.color, backgroundColor: treadInfo.color + '20', padding: '5px 12px', borderRadius: '15px' }}>{treadInfo.label}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '13px', color: '#666' }}>
                    <div>Your stopping distance: <strong>~{quote.tread.stopping_distance_ft || 350} ft</strong></div>
                    <div>New tires: <strong>~{quote.tread.new_tire_stopping_distance_ft || 220} ft</strong></div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ backgroundColor: '#9b59b6', borderRadius: '10px', padding: '20px', color: 'white', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{quote.tire?.brand} {quote.tire?.name}</h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>{quote.tire?.size} | Part#: {quote.tire?.part_number}</p>
              {quote.tire?.warranty_miles && <p style={{ margin: '8px 0 0 0', opacity: 0.8, fontSize: '12px' }}>✓ {parseInt(quote.tire.warranty_miles).toLocaleString()} Mile Tread Warranty</p>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px' }}>Tires ({formatCurrency(p?.price_per_tire)} × {p?.quantity})</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>{formatCurrency(p?.subtotal_tires)}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px' }}>Mount & Balance ({formatCurrency(p?.mount_balance_per_tire)} × {p?.quantity})</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px' }}>{formatCurrency(p?.subtotal_mount_balance)}</td></tr>
                <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px' }}>Road Hazard Protection ({formatCurrency(p?.road_hazard_per_tire)} × {p?.quantity})</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px' }}>{formatCurrency(p?.subtotal_road_hazard)}</td></tr>
                {p?.subtotal_fet > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px' }}>Federal Excise Tax</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px' }}>{formatCurrency(p?.subtotal_fet)}</td></tr>}
                <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px' }}>Sales Tax ({(p?.tax_rate * 100).toFixed(2)}%)</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px' }}>{formatCurrency(p?.tax_amount)}</td></tr>
                {p?.promo_discount > 0 && <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '12px 0', fontSize: '14px', color: '#27ae60' }}>{p?.promo_name || 'Promotion'}</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#27ae60' }}>-{formatCurrency(p?.promo_discount)}</td></tr>}
                <tr style={{ backgroundColor: '#f8f9fa' }}><td style={{ padding: '15px 0', fontSize: '18px', fontWeight: '700' }}>Total</td><td style={{ padding: '15px 0', textAlign: 'right', fontSize: '18px', fontWeight: '700' }}>{formatCurrency(p?.total_amount)}</td></tr>
                {p?.rebate_amount > 0 && <tr><td style={{ padding: '12px 0', fontSize: '14px', color: '#27ae60' }}>After Rebate</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#27ae60', fontWeight: '600' }}>{formatCurrency(p?.total_after_rebate)}</td></tr>}
                <tr><td style={{ padding: '12px 0', fontSize: '13px', color: '#888' }}>Per Tire Installed</td><td style={{ padding: '12px 0', textAlign: 'right', fontSize: '13px', color: '#888' }}>{formatCurrency(p?.per_tire_installed)}</td></tr>
              </tbody>
            </table>

            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
              <p style={{ margin: '0 0 5px 0' }}>This quote expires on <strong>{new Date(quote.expires_at).toLocaleDateString()}</strong></p>
              <p style={{ margin: 0 }}>This is not an estimate or invoice. Before any tire work is performed, you will be presented a written estimate for signature. We reserve the right to correct clerical errors.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
