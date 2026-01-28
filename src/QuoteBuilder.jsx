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

// Promo options - matches quote_config in database
const PROMOS = [
  { id: 'FREE_INSTALL', name: 'Free Installation' },
  { id: '10PCT_TIRES', name: '10% Off Tires' },
  { id: 'NEXEN_B3G1', name: 'Buy 3 Nexen Get 1 Free' },
  { id: 'MILITARY_15', name: 'Military Discount (15%)' },
  { id: 'FIRST_RESP_12', name: 'First Responder (12%)' },
  { id: 'SENIOR_12', name: 'Senior 55+ (12%)' },
];

// Rebate options - empty for now, ready for future manufacturer rebates
const REBATES = [];

// Updated thresholds: 0-4 red, 5-6 yellow, 7+ green
const getTreadColor = (val) => {
  if (val === '' || val === null || val === undefined) return '#9b59b6';
  const depth = parseInt(val);
  if (isNaN(depth)) return '#9b59b6';
  if (depth >= 7) return '#27ae60';  // Green: 7+
  if (depth >= 5) return '#f1c40f';  // Yellow: 5-6
  return '#e74c3c';                   // Red: 0-4
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

// Phone number formatting helper
const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 10);
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
};

const stripPhoneFormatting = (value) => value.replace(/\D/g, '');

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

// Phone Input with mask
const PhoneInput = ({ value, onChange, placeholder, style }) => {
  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder || "(805) 555-1234"}
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
    />
  );
};

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
        width: '40px',
        height: '36px',
        border: `2px solid ${color}`,
        borderRadius: '6px',
        fontSize: '15px',
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
    <div style={{ display: 'flex', gap: '4px' }}>
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

// Navigation items
const NAV_ITEMS = [
  { label: 'TIRE FINDER', href: '#/', active: false },
  { label: 'STORE INVENTORY', href: '#/inventory', active: false },
  { label: 'ENTERPRISE RENT-A-CAR', href: '#/enterprise', active: false },
  { label: 'FLEET NEGOTIATED', href: '#/fleet', active: false },
];

// Header Component - matches TireFinder
const Header = ({ selectedStore, onStoreChange }) => (
  <>
    <header style={{ backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <a href="#/">
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '45px' }}
          />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>STORE:</span>
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            style={{
              padding: '8px 30px 8px 15px',
              border: '2px solid #9b59b6',
              borderRadius: '20px',
              backgroundColor: 'white',
              color: '#333',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {STORES.map(store => (
              <option key={store.id} value={store.id}>{store.id} - {store.name}</option>
            ))}
          </select>
        </div>
      </div>
    </header>

    {/* Purple Nav Bar */}
    <nav style={{ backgroundColor: '#9b59b6', padding: '12px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '1px',
              padding: '5px 10px',
              borderBottom: item.active ? '2px solid white' : '2px solid transparent',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  </>
);

// Footer Component - matches TireFinder
const Footer = () => (
  <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ fontSize: '13px', marginBottom: '8px' }}>
        © 2026 My Jiffy Lube Group. Tire data provided by MOTOR & USAutoForce.
      </p>
      <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
        tires.myjiffylube.ai
      </p>
    </div>
  </footer>
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
    lf: { inside: '', middle: '', outside: '' },
    rf: { inside: '', middle: '', outside: '' },
    lr: { inside: '', middle: '', outside: '' },
    rr: { inside: '', middle: '', outside: '' },
  });

  const [quantity, setQuantity] = useState(4);
  
  // Promo and Rebate selection
  const [selectedPromo, setSelectedPromo] = useState('');
  const [selectedRebate, setSelectedRebate] = useState('');
  
  const [generating, setGenerating] = useState(false);
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

  // Load tire/vehicle/qty from sessionStorage on mount
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
        const formattedPhone = data.customer.phone ? formatPhoneNumber(data.customer.phone) : '';
        setCustomerData({
          first_name: data.customer.first_name || '', 
          last_name: data.customer.last_name || '',
          full_name: data.customer.full_name || '', 
          phone: formattedPhone,
          email: data.customer.email || '', 
          vehicle_ymm: data.customer.vehicle_ymm || '', 
          data_source: 'lookup'
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
    const phoneForStorage = stripPhoneFormatting(customerData.phone);
    
    try {
      const requestBody = {
        key: API_KEY,
        store_id: parseInt(selectedStore),
        employee: { user_id: selectedEmployee.user_id || selectedEmployee.employee_id, user_name: selectedEmployee.user_name || selectedEmployee.display_name },
        customer: {
          first_name: customerData.first_name, 
          last_name: customerData.last_name,
          full_name: customerData.full_name || `${customerData.first_name} ${customerData.last_name}`.trim(),
          phone: phoneForStorage,
          email: customerData.email,
          license_plate: licensePlate || null, 
          license_state: licensePlate ? licenseState : null, 
          data_source: customerData.data_source
        },
        vehicle: vehicleData ? { 
          year: vehicleData.year, 
          make: vehicleData.make, 
          model: vehicleData.model, 
          submodel: vehicleData.submodel, 
          display: vehicleData.display,
          oe_tire_size: vehicleData.oe_tire_size || tireData?.tire_size || tireData?.size,
          oe_load_rating: vehicleData.oe_load_rating || tireData?.load_rating,
          oe_speed_rating: vehicleData.oe_speed_rating || tireData?.speed_rating
        } : null,
        tread_depth: lowestTread !== null ? {
          lf: { inside: treadDepths.lf.inside ? parseInt(treadDepths.lf.inside) : null, middle: treadDepths.lf.middle ? parseInt(treadDepths.lf.middle) : null, outside: treadDepths.lf.outside ? parseInt(treadDepths.lf.outside) : null },
          rf: { inside: treadDepths.rf.inside ? parseInt(treadDepths.rf.inside) : null, middle: treadDepths.rf.middle ? parseInt(treadDepths.rf.middle) : null, outside: treadDepths.rf.outside ? parseInt(treadDepths.rf.outside) : null },
          lr: { inside: treadDepths.lr.inside ? parseInt(treadDepths.lr.inside) : null, middle: treadDepths.lr.middle ? parseInt(treadDepths.lr.middle) : null, outside: treadDepths.lr.outside ? parseInt(treadDepths.lr.outside) : null },
          rr: { inside: treadDepths.rr.inside ? parseInt(treadDepths.rr.inside) : null, middle: treadDepths.rr.middle ? parseInt(treadDepths.rr.middle) : null, outside: treadDepths.rr.outside ? parseInt(treadDepths.rr.outside) : null },
          lowest: lowestTread
        } : null,
        tire: {
          part_number: tireData.part_number, 
          brand: tireData.brand || tireData.brand_code, 
          name: tireData.name || tireData.sales_class,
          size: tireData.tire_size || tireData.size, 
          type: tireData.tire_type, 
          warranty_miles: tireData.warranty ? parseInt(tireData.warranty) : null,
          load_rating: tireData.load_rating, 
          speed_rating: tireData.speed_rating, 
          load_range: tireData.load_range,
          snowflake: tireData.snowflake || false, 
          run_flat: tireData.run_flat || false,
          price: tireData.consumer_price || tireData.price, 
          cost: tireData.cost || null, 
          fet: tireData.fet ? parseFloat(tireData.fet) : 0
        },
        quantity, 
        
        // Promo selection from dropdown
        promo_id: selectedPromo || null,
        
        // Rebate - will be used when rebates are added
        rebate_amount: selectedRebate ? (REBATES.find(r => r.id === selectedRebate)?.amount || 0) : 0, 
        rebate_description: selectedRebate ? (REBATES.find(r => r.id === selectedRebate)?.description || null) : null
      };
      
      const response = await fetch(`${API_BASE}/generate-quote`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(requestBody) 
      });
      const data = await response.json();
      
      if (data.success) {
        // Clear sessionStorage
        sessionStorage.removeItem('jl_quote_tire');
        sessionStorage.removeItem('jl_quote_vehicle');
        sessionStorage.removeItem('jl_quote_qty');
        window.location.hash = `#/quote/${data.quote.short_code}`;
      } else { 
        setError(data.error || 'Failed to generate quote'); 
      }
    } catch (e) { 
      setError('Failed to generate quote'); 
    } finally { 
      setGenerating(false); 
    }
  };

  const consumerPrice = tireData?.consumer_price || tireData?.price || 0;
  const tireSize = tireData?.tire_size || tireData?.size || '';

  // No tire selected state
  if (!tireData) {
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
        <Header selectedStore={selectedStore} onStoreChange={setSelectedStore} />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '50px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🛞</div>
            <h2 style={{ color: '#9b59b6', fontSize: '24px', fontWeight: '700', marginBottom: '15px' }}>No Tire Selected</h2>
            <p style={{ color: '#888', marginBottom: '25px' }}>Please search for tires first, then click the QUOTE button on a tire to start a quote.</p>
            <a href="#/" style={{ backgroundColor: '#9b59b6', color: 'white', textDecoration: 'none', padding: '14px 35px', borderRadius: '25px', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', display: 'inline-block' }}>GO TO TIRE FINDER</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
      <Header selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <h2 style={{ color: '#9b59b6', fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '3px' }}>CREATE QUOTE</h2>
          <p style={{ color: '#888', textAlign: 'center', fontSize: '13px', marginBottom: '30px', letterSpacing: '2px' }}>TIRE QUOTE BUILDER</p>

          {/* Selected Tire Banner */}
          <div style={{ backgroundColor: '#9b59b6', borderRadius: '10px', padding: '20px 25px', color: 'white', marginBottom: promoData ? '15px' : '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '700' }}>{tireData.brand_code || tireData.brand} {tireData.tire_size || tireData.size} {tireData.name || tireData.sales_class}</h3>
                <p style={{ margin: '0', opacity: 0.9, fontSize: '13px' }}>Part#: {tireData.part_number}</p>
                {tireData.warranty && <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '12px' }}>✓ {parseInt(tireData.warranty).toLocaleString()} Mile Warranty</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>{formatCurrency(consumerPrice)}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>per tire</div>
              </div>
            </div>
          </div>

          {/* Vehicle Info (if available) - NO EMOJI */}
          {vehicleData?.display && (
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '15px 20px', marginBottom: '25px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{vehicleData.display}</div>
              {tireSize && (
                <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
                  OE Tire Size: {tireSize}
                  {tireData?.load_rating && ` | Load: ${tireData.load_rating}`}
                  {tireData?.speed_rating && ` | Speed: ${tireData.speed_rating}`}
                </div>
              )}
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
                <SelectDropdown 
                  value={selectedEmployee?.employee_id || ''} 
                  onChange={(val) => setSelectedEmployee(employees.find(e => e.employee_id === parseInt(val)) || null)} 
                  options={employees.map(e => ({ value: e.employee_id, label: e.display_name }))} 
                  placeholder={employeesLoading ? "LOADING..." : "SELECT EMPLOYEE"} 
                />
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
                  <StyledInput 
                    value={licensePlate} 
                    onChange={(v) => setLicensePlate(v.toUpperCase())} 
                    placeholder="LICENSE PLATE" 
                    style={{ flex: 1 }} 
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()} 
                  />
                  <SelectDropdown 
                    value={licenseState} 
                    onChange={setLicenseState} 
                    options={US_STATES} 
                    placeholder="ST" 
                    style={{ width: '80px', minWidth: '80px' }} 
                  />
                  <button 
                    onClick={handleCustomerLookup} 
                    disabled={!licensePlate.trim() || customerLookupLoading} 
                    style={{ 
                      backgroundColor: licensePlate.trim() ? '#9b59b6' : '#ccc', 
                      color: 'white', 
                      border: 'none', 
                      padding: '10px 15px', 
                      borderRadius: '25px', 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      cursor: licensePlate.trim() ? 'pointer' : 'not-allowed' 
                    }}
                  >
                    {customerLookupLoading ? '...' : '🔍'}
                  </button>
                </div>
                {customerFound && (
                  <div style={{ backgroundColor: '#f0fff4', border: '1px solid #27ae60', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '11px', color: '#27ae60', fontWeight: '600' }}>
                    ✓ Customer found!
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <StyledInput value={customerData.first_name} onChange={(v) => setCustomerData({...customerData, first_name: v})} placeholder="FIRST NAME" />
                  <StyledInput value={customerData.last_name} onChange={(v) => setCustomerData({...customerData, last_name: v})} placeholder="LAST NAME" />
                  <PhoneInput value={customerData.phone} onChange={(v) => setCustomerData({...customerData, phone: v})} placeholder="(805) 555-1234" />
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
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>PROMOTION</label>
                    <SelectDropdown 
                      value={selectedPromo} 
                      onChange={setSelectedPromo} 
                      options={PROMOS.map(p => ({ value: p.id, label: p.name }))} 
                      placeholder="NONE" 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>REBATE</label>
                    <SelectDropdown 
                      value={selectedRebate} 
                      onChange={setSelectedRebate} 
                      options={REBATES.map(r => ({ value: r.id, label: r.name }))} 
                      placeholder={REBATES.length === 0 ? "NO REBATES AVAILABLE" : "NONE"}
                      disabled={REBATES.length === 0}
                    />
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

              {/* Car with tread inputs - CORRECTED LAYOUT */}
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '15px', padding: '20px', position: 'relative' }}>
                
                {/* Direction indicator */}
                <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '10px', color: '#999', letterSpacing: '1px' }}>
                  ← FRONT OF VEHICLE
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  {/* LEFT SIDE: Front tires (RF top, LF bottom) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                    <TireTreadBlock label="PASS FRONT" values={treadDepths.rf} onChange={(pos, val) => updateTread('rf', pos, val)} />
                    <TireTreadBlock label="DRIVER FRONT" values={treadDepths.lf} onChange={(pos, val) => updateTread('lf', pos, val)} />
                  </div>

                  {/* Center - Car Image */}
                  <div style={{ padding: '0 15px' }}>
                    <img 
                      src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/Vehicle-image.png"
                      alt="Vehicle"
                      style={{ width: '140px', opacity: 0.85 }}
                    />
                  </div>

                  {/* RIGHT SIDE: Rear tires (RR top, LR bottom) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                    <TireTreadBlock label="PASS REAR" values={treadDepths.rr} onChange={(pos, val) => updateTread('rr', pos, val)} />
                    <TireTreadBlock label="DRIVER REAR" values={treadDepths.lr} onChange={(pos, val) => updateTread('lr', pos, val)} />
                  </div>
                </div>

                {/* Legend - NO STATUS BOX, just legend */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '9px', color: '#888' }}>
                  <span>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#27ae60', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
                    7+ Good
                  </span>
                  <span>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#f1c40f', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
                    5-6 Consider
                  </span>
                  <span>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#e74c3c', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span>
                    0-4 Replace
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: '#fee', border: '1px solid #e74c3c', borderRadius: '10px', padding: '15px', marginTop: '25px', color: '#c0392b', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              onClick={handleGenerateQuote} 
              disabled={generating || !selectedEmployee} 
              style={{ 
                backgroundColor: generating || !selectedEmployee ? '#ccc' : '#9b59b6', 
                color: 'white', 
                border: 'none', 
                padding: '16px 60px', 
                borderRadius: '30px', 
                fontSize: '14px', 
                fontWeight: '700', 
                letterSpacing: '3px', 
                cursor: generating || !selectedEmployee ? 'not-allowed' : 'pointer', 
                boxShadow: generating || !selectedEmployee ? 'none' : '0 4px 15px rgba(155, 89, 182, 0.3)' 
              }}
            >
              {generating ? 'GENERATING...' : 'GENERATE QUOTE'}
            </button>
            {!selectedEmployee && (
              <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px' }}>
                Please select an employee to continue
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
