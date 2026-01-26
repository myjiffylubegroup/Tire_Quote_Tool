import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

const STORES = [
  { id: 609, name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const QTY_OPTIONS = [1, 2, 4, 5, 6, 8];

const getTreadStatus = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth >= 6) return { status: 'good', label: 'GOOD', color: '#27ae60' };
  if (depth === 5) return { status: 'attention', label: 'NEEDS ATTENTION', color: '#f1c40f' };
  return { status: 'replace', label: 'REPLACE NOW', color: '#e74c3c' };
};

const getStoppingDistance = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth >= 10) return 220;
  if (depth >= 6) return 260;
  if (depth === 5) return 300;
  if (depth >= 3) return 350;
  return 400;
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const getTreadColor = (val) => {
  if (val === '' || val === null || val === undefined) return '#9b59b6';
  const depth = parseInt(val);
  if (isNaN(depth)) return '#9b59b6';
  if (depth >= 6) return '#27ae60';
  if (depth === 5) return '#f1c40f';
  return '#e74c3c';
};

// Styled Select Dropdown
const SelectDropdown = ({ value, onChange, options, placeholder, disabled, style }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: disabled ? '#f5f5f5' : 'white',
      color: disabled ? '#999' : '#333',
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      appearance: 'none',
      backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 15px center',
      ...style
    }}
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
        {typeof opt === 'object' ? opt.label : opt}
      </option>
    ))}
  </select>
);

// Styled Input
const StyledInput = ({ value, onChange, placeholder, type = 'text', style, ...props }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: 'white',
      color: '#333',
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'center',
      outline: 'none',
      boxSizing: 'border-box',
      ...style
    }}
    {...props}
  />
);

// Mini tread input for the grid
const MiniTreadInput = ({ value, onChange }) => {
  const color = getTreadColor(value);
  return (
    <input
      type="number"
      min="0"
      max="12"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '36px',
        height: '32px',
        border: `2px solid ${color}`,
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '700',
        textAlign: 'center',
        outline: 'none',
        color: color,
        backgroundColor: value ? color + '15' : 'white',
        padding: '0',
      }}
    />
  );
};

// Tire tread block - 3 inputs (IN/MID/OUT) for one tire
const TireTreadBlock = ({ label, values, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <span style={{ fontSize: '10px', fontWeight: '700', color: '#666', letterSpacing: '1px' }}>{label}</span>
    <div style={{ display: 'flex', gap: '3px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>IN</div>
        <MiniTreadInput value={values.inside} onChange={(v) => onChange('inside', v)} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>MID</div>
        <MiniTreadInput value={values.middle} onChange={(v) => onChange('middle', v)} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '8px', color: '#999', marginBottom: '2px' }}>OUT</div>
        <MiniTreadInput value={values.outside} onChange={(v) => onChange('outside', v)} />
      </div>
    </div>
  </div>
);

export default function QuoteBuilder() {
  const [tireData, setTireData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem('jl_tire_store') || '609');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(() => {
    const saved = localStorage.getItem('jl_quote_employee');
    return saved ? JSON.parse(saved) : null;
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseState, setLicenseState] = useState('CA');
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [customerData, setCustomerData] = useState({
    first_name: '', last_name: '', full_name: '', phone: '', email: '', vehicle_ymm: '', data_source: 'manual'
  });

  // Tread depths: 4 tires × 3 readings each
  const [treadDepths, setTreadDepths] = useState({
    fl: { inside: '', middle: '', outside: '' },
    fr: { inside: '', middle: '', outside: '' },
    rl: { inside: '', middle: '', outside: '' },
    rr: { inside: '', middle: '', outside: '' },
  });

  const [quantity, setQuantity] = useState(4);
  const [rebateAmount, setRebateAmount] = useState('');
  const [rebateDescription, setRebateDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [error, setError] = useState(null);

  const updateTread = (tire, position, value) => {
    setTreadDepths(prev => ({
      ...prev,
      [tire]: { ...prev[tire], [position]: value }
    }));
  };

  const getLowestTread = () => {
    const allValues = Object.values(treadDepths)
      .flatMap(tire => Object.values(tire))
      .filter(d => d !== '' && !isNaN(parseInt(d)))
      .map(d => parseInt(d));
    return allValues.length > 0 ? Math.min(...allValues) : null;
  };

  useEffect(() => {
    const savedTire = sessionStorage.getItem('jl_quote_tire');
    const savedVehicle = sessionStorage.getItem('jl_quote_vehicle');
    const savedQty = sessionStorage.getItem('jl_quote_qty');
    if (savedTire) setTireData(JSON.parse(savedTire));
    if (savedVehicle) setVehicleData(JSON.parse(savedVehicle));
    if (savedQty) setQuantity(parseInt(savedQty));
  }, []);

  useEffect(() => { localStorage.setItem('jl_tire_store', selectedStore); }, [selectedStore]);
  useEffect(() => { if (selectedEmployee) localStorage.setItem('jl_quote_employee', JSON.stringify(selectedEmployee)); }, [selectedEmployee]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const response = await fetch(`${API_BASE}/employee-list?store_id=${selectedStore}&key=${API_KEY}`);
        const data = await response.json();
        if (data.success) {
          setEmployees(data.employees || []);
          if (selectedEmployee && !data.employees?.some(e => e.employee_id === selectedEmployee.employee_id)) {
            setSelectedEmployee(null);
          }
        }
      } catch (e) { console.error('Failed to fetch employees:', e); }
      finally { setEmployeesLoading(false); }
    };
    fetchEmployees();
  }, [selectedStore]);

  const handleCustomerLookup = async () => {
    if (!licensePlate.trim()) return;
    setCustomerLookupLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/customer-lookup?plate=${encodeURIComponent(licensePlate)}&state=${licenseState}&key=${API_KEY}`);
      const data = await response.json();
      if (data.success && data.found) {
        setCustomerFound(true);
        setCustomerData({
          first_name: data.customer.first_name || '', last_name: data.customer.last_name || '',
          full_name: data.customer.full_name || '', phone: data.customer.phone || '',
          email: data.customer.email || '', vehicle_ymm: data.customer.vehicle_ymm || '', data_source: 'lookup'
        });
        if (data.customer.vehicle_ymm && !vehicleData?.display) {
          setVehicleData({ display: data.customer.vehicle_ymm });
        }
      } else {
        setCustomerFound(false);
        setCustomerData({ first_name: '', last_name: '', full_name: '', phone: '', email: '', vehicle_ymm: '', data_source: 'manual' });
      }
    } catch (e) { setError('Failed to lookup customer'); }
    finally { setCustomerLookupLoading(false); }
  };

  const handleGenerateQuote = async () => {
    if (!tireData || !selectedEmployee) { setError('Please select a tire and employee'); return; }
    setGenerating(true);
    setError(null);
    const lowestTread = getLowestTread();
    try {
      const requestBody = {
        key: API_KEY,
        store_id: parseInt(selectedStore),
        employee: { user_id: selectedEmployee.user_id || selectedEmployee.employee_id, user_name: selectedEmployee.user_name || selectedEmployee.display_name },
        customer: {
          first_name: customerData.first_name, last_name: customerData.last_name,
          full_name: customerData.full_name || `${customerData.first_name} ${customerData.last_name}`.trim(),
          phone: customerData.phone, email: customerData.email,
          license_plate: licensePlate || null, license_state: licensePlate ? licenseState : null, data_source: customerData.data_source
        },
        vehicle: vehicleData ? { year: vehicleData.year, make: vehicleData.make, model: vehicleData.model, submodel: vehicleData.submodel, display: vehicleData.display } : null,
        tread_depth: lowestTread !== null ? {
          front_left: { inside: treadDepths.fl.inside ? parseInt(treadDepths.fl.inside) : null, middle: treadDepths.fl.middle ? parseInt(treadDepths.fl.middle) : null, outside: treadDepths.fl.outside ? parseInt(treadDepths.fl.outside) : null },
          front_right: { inside: treadDepths.fr.inside ? parseInt(treadDepths.fr.inside) : null, middle: treadDepths.fr.middle ? parseInt(treadDepths.fr.middle) : null, outside: treadDepths.fr.outside ? parseInt(treadDepths.fr.outside) : null },
          rear_left: { inside: treadDepths.rl.inside ? parseInt(treadDepths.rl.inside) : null, middle: treadDepths.rl.middle ? parseInt(treadDepths.rl.middle) : null, outside: treadDepths.rl.outside ? parseInt(treadDepths.rl.outside) : null },
          rear_right: { inside: treadDepths.rr.inside ? parseInt(treadDepths.rr.inside) : null, middle: treadDepths.rr.middle ? parseInt(treadDepths.rr.middle) : null, outside: treadDepths.rr.outside ? parseInt(treadDepths.rr.outside) : null },
          lowest: lowestTread
        } : null,
        tire: {
          part_number: tireData.part_number, brand: tireData.brand || tireData.brand_code, name: tireData.name || tireData.sales_class,
          size: tireData.tire_size || tireData.size, type: tireData.tire_type, warranty_miles: tireData.warranty ? parseInt(tireData.warranty) : null,
          load_rating: tireData.load_rating, speed_rating: tireData.speed_rating, load_range: tireData.load_range,
          snowflake: tireData.snowflake || false, run_flat: tireData.run_flat || false,
          price: tireData.consumer_price || tireData.price, cost: tireData.cost || null, fet: tireData.fet ? parseFloat(tireData.fet) : 0
        },
        quantity, rebate_amount: rebateAmount ? parseFloat(rebateAmount) : 0, rebate_description: rebateDescription || null
      };
      const response = await fetch(`${API_BASE}/generate-quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const data = await response.json();
      if (data.success) {
        setGeneratedQuote(data.quote);
        sessionStorage.removeItem('jl_quote_tire');
        sessionStorage.removeItem('jl_quote_vehicle');
        sessionStorage.removeItem('jl_quote_qty');
      } else { setError(data.error || 'Failed to generate quote'); }
    } catch (e) { setError('Failed to generate quote'); }
    finally { setGenerating(false); }
  };

  const handleEmailQuote = async () => {
    if (!generatedQuote) return;
    const email = customerData.email || prompt('Enter email address:');
    if (!email) return;
    try {
      const response = await fetch(`${API_BASE}/email-quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: API_KEY, quote_id: generatedQuote.quote_id, email_override: email !== customerData.email ? email : null }) });
      const data = await response.json();
      alert(data.success ? `Quote emailed to ${data.emailed_to}` : 'Failed: ' + (data.error || 'Unknown error'));
    } catch { alert('Failed to send email'); }
  };

  const handlePrint = () => { if (generatedQuote?.short_code) window.open(`#/quote/${generatedQuote.short_code}`, '_blank'); };

  // Header
  const Header = () => (
    <>
      <header style={{ backgroundColor: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <img src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png" alt="Jiffy Lube Multicare" style={{ height: '50px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#333', fontSize: '13px', fontWeight: '600' }}>STORE:</span>
          <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} style={{ padding: '8px 30px 8px 15px', border: '2px solid #9b59b6', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
            {STORES.map(store => <option key={store.id} value={store.id}>{store.id} - {store.name}</option>)}
          </select>
        </div>
      </header>
      <nav style={{ backgroundColor: '#9b59b6', padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
        <a href="#/" style={{ color: 'white', textDecoration: 'none', fontSize: '12px', fontWeight: '700', letterSpacing: '2px' }}>TIRE FINDER</a>
        <a href="#/inventory" style={{ color: 'white', textDecoration: 'none', fontSize: '12px', fontWeight: '700', letterSpacing: '2px' }}>STORE INVENTORY</a>
      </nav>
    </>
  );

  const Footer = () => (
    <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px', marginTop: '30px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>© 2026 My Jiffy Lube Group. Tire data provided by MOTOR & USAutoForce.</p>
        <p style={{ fontSize: '11px', color: '#7f8c8d' }}>tires.myjiffylube.ai</p>
      </div>
    </footer>
  );

  // No tire selected
  if (!tireData) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '50px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: '15px' }}>No Tire Selected</h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>Please select a tire from the Tire Finder to create a quote.</p>
            <a href="#/" style={{ backgroundColor: '#9b59b6', color: 'white', padding: '12px 30px', borderRadius: '25px', textDecoration: 'none', fontWeight: '600' }}>Go to Tire Finder</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Quote generated success
  if (generatedQuote) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
        <Header />
        <div style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>✅</div>
            <h2 style={{ color: '#27ae60', marginBottom: '10px' }}>Quote Created!</h2>
            <p style={{ color: '#666', marginBottom: '5px' }}>Quote Number: <strong style={{ color: '#9b59b6' }}>{generatedQuote.quote_number}</strong></p>
            <p style={{ color: '#888', marginBottom: '25px', fontSize: '13px' }}>Expires: {new Date(generatedQuote.expires_at).toLocaleDateString()}</p>
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', marginBottom: '25px', textAlign: 'left' }}>
              <p style={{ margin: '0 0 10px 0' }}><strong>Customer:</strong> {generatedQuote.customer?.name || 'Not provided'}</p>
              {generatedQuote.vehicle && <p style={{ margin: '0 0 10px 0' }}><strong>Vehicle:</strong> {generatedQuote.vehicle}</p>}
              <p style={{ margin: '0 0 10px 0' }}><strong>Tire:</strong> {generatedQuote.tire?.brand} {generatedQuote.tire?.name}</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#9b59b6' }}><strong>Total:</strong> {formatCurrency(generatedQuote.pricing?.total_before_rebate)}</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '25px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Print Quote</button>
              <button onClick={handleEmailQuote} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '25px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📧 Email Quote</button>
            </div>
            <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <a href="#/" style={{ color: '#9b59b6', textDecoration: 'none', fontWeight: '600' }}>← Create Another Quote</a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const lowestTread = getLowestTread();
  const treadStatus = getTreadStatus(lowestTread);
  const stoppingDistance = getStoppingDistance(lowestTread);
  const consumerPrice = tireData.consumer_price || tireData.price || 0;

  // Main form
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
      <Header />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <h2 style={{ color: '#9b59b6', fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '3px' }}>CREATE QUOTE</h2>
          <p style={{ color: '#888', textAlign: 'center', fontSize: '13px', marginBottom: '30px', letterSpacing: '2px' }}>TIRE QUOTE BUILDER</p>

          {/* Selected Tire */}
          <div style={{ backgroundColor: '#9b59b6', borderRadius: '10px', padding: '20px 25px', color: 'white', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700' }}>{tireData.brand_code || tireData.brand} {tireData.tire_size || tireData.size} {tireData.name || tireData.sales_class}</h3>
                <p style={{ margin: '0', opacity: 0.9, fontSize: '13px' }}>Part#: {tireData.part_number}</p>
                {tireData.warranty && <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '12px' }}>✓ {parseInt(tireData.warranty).toLocaleString()} Mile Warranty</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{formatCurrency(consumerPrice)}</div>
                {tireData.fet > 0 && <div style={{ fontSize: '11px', opacity: 0.8 }}>+ {formatCurrency(parseFloat(tireData.fet))} FET</div>}
              </div>
            </div>
          </div>

          {/* Vehicle */}
          {vehicleData?.display && (
            <div style={{ backgroundColor: '#f8f4ff', border: '2px solid #9b59b6', borderRadius: '10px', padding: '15px 20px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🚗</span>
              <span style={{ fontWeight: '600', color: '#333', fontSize: '16px' }}>{vehicleData.display}</span>
            </div>
          )}

          {/* Two Column Layout */}
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            
            {/* Left Column - Employee & Customer */}
            <div style={{ flex: '1', minWidth: '280px' }}>
              
              {/* Employee */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>QUOTE CREATED BY</span>
                </div>
                <SelectDropdown value={selectedEmployee?.employee_id || ''} onChange={(val) => setSelectedEmployee(employees.find(e => e.employee_id === parseInt(val)) || null)} options={employees.map(e => ({ value: e.employee_id, label: e.display_name }))} placeholder={employeesLoading ? "LOADING..." : "SELECT EMPLOYEE"} />
              </div>

              {/* Customer Lookup */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>CUSTOMER LOOKUP</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <StyledInput value={licensePlate} onChange={(v) => setLicensePlate(v.toUpperCase())} placeholder="LICENSE PLATE" style={{ flex: 1 }} onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()} />
                  <SelectDropdown value={licenseState} onChange={setLicenseState} options={US_STATES} placeholder="ST" style={{ width: '80px', minWidth: '80px' }} />
                  <button onClick={handleCustomerLookup} disabled={!licensePlate.trim() || customerLookupLoading} style={{ backgroundColor: licensePlate.trim() ? '#9b59b6' : '#ccc', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '25px', fontSize: '12px', fontWeight: '700', cursor: licensePlate.trim() ? 'pointer' : 'not-allowed' }}>
                    {customerLookupLoading ? '...' : '🔍'}
                  </button>
                </div>
                {customerFound && <div style={{ backgroundColor: '#f0fff4', border: '1px solid #27ae60', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '11px', color: '#27ae60', fontWeight: '600' }}>✓ Customer found!</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <StyledInput value={customerData.first_name} onChange={(v) => setCustomerData({...customerData, first_name: v})} placeholder="FIRST NAME" />
                  <StyledInput value={customerData.last_name} onChange={(v) => setCustomerData({...customerData, last_name: v})} placeholder="LAST NAME" />
                  <StyledInput value={customerData.phone} onChange={(v) => setCustomerData({...customerData, phone: v})} placeholder="PHONE" />
                  <StyledInput value={customerData.email} onChange={(v) => setCustomerData({...customerData, email: v})} placeholder="EMAIL" />
                </div>
              </div>

              {/* Quote Options */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>QUOTE OPTIONS</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ width: '70px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>QTY</label>
                    <SelectDropdown value={quantity} onChange={(v) => setQuantity(parseInt(v))} options={QTY_OPTIONS} placeholder="4" />
                  </div>
                  <div style={{ flex: 1, minWidth: '80px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>REBATE $</label>
                    <StyledInput type="number" value={rebateAmount} onChange={setRebateAmount} placeholder="0.00" />
                  </div>
                  <div style={{ flex: 2, minWidth: '120px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>REBATE DESC</label>
                    <StyledInput value={rebateDescription} onChange={setRebateDescription} placeholder="e.g., Spring Rebate" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tread Depth with Car Image */}
            <div style={{ flex: '1.2', minWidth: '400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>CURRENT TREAD DEPTH (32nds)</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginLeft: '8px', position: 'relative' }}>
                  <div style={{ position: 'absolute', right: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                </div>
              </div>

              {/* Car with tread inputs around it */}
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '15px', padding: '20px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Left side - FL and RL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
                    <TireTreadBlock label="FRONT LEFT" values={treadDepths.fl} onChange={(pos, val) => updateTread('fl', pos, val)} />
                    <TireTreadBlock label="REAR LEFT" values={treadDepths.rl} onChange={(pos, val) => updateTread('rl', pos, val)} />
                  </div>

                  {/* Center - Car Image */}
                  <div style={{ padding: '0 15px' }}>
                    <img 
                      src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/Vehicle-image.png"
                      alt="Vehicle"
                      style={{ width: '140px', opacity: 0.85 }}
                    />
                  </div>

                  {/* Right side - FR and RR */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
                    <TireTreadBlock label="FRONT RIGHT" values={treadDepths.fr} onChange={(pos, val) => updateTread('fr', pos, val)} />
                    <TireTreadBlock label="REAR RIGHT" values={treadDepths.rr} onChange={(pos, val) => updateTread('rr', pos, val)} />
                  </div>
                </div>

                {/* Status */}
                {lowestTread !== null && (
                  <div style={{ marginTop: '20px', padding: '12px 15px', backgroundColor: treadStatus?.color + '15', border: `2px solid ${treadStatus?.color}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '22px', fontWeight: '700', color: treadStatus?.color }}>{lowestTread}/32"</span>
                      <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: '700', color: treadStatus?.color, backgroundColor: treadStatus?.color + '20', padding: '3px 10px', borderRadius: '12px' }}>{treadStatus?.label}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10px', color: '#666' }}>
                      <div>Your stopping: <strong>~{stoppingDistance}ft</strong></div>
                      <div>New tires: <strong>~220ft</strong></div>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '9px', color: '#888' }}>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#27ae60', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>6+ Good</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f1c40f', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>5 Attention</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#e74c3c', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>&lt;5 Replace</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div style={{ backgroundColor: '#fee', border: '1px solid #e74c3c', borderRadius: '10px', padding: '15px', marginTop: '25px', color: '#c0392b', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

          {/* Generate Button */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button onClick={handleGenerateQuote} disabled={generating || !selectedEmployee} style={{ backgroundColor: generating || !selectedEmployee ? '#ccc' : '#9b59b6', color: 'white', border: 'none', padding: '16px 60px', borderRadius: '30px', fontSize: '14px', fontWeight: '700', letterSpacing: '3px', cursor: generating || !selectedEmployee ? 'not-allowed' : 'pointer', boxShadow: generating || !selectedEmployee ? 'none' : '0 4px 15px rgba(155, 89, 182, 0.3)' }}>
              {generating ? 'GENERATING...' : 'GENERATE QUOTE'}
            </button>
            {!selectedEmployee && <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px' }}>Please select an employee to continue</p>}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
