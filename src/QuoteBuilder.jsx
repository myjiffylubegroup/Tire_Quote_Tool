import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

// Store list with city names
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

// US States for license plate dropdown
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

// Quantity options
const QTY_OPTIONS = [1, 2, 4, 5, 6, 8];

// Tread depth status helper
const getTreadStatus = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth >= 6) return { status: 'good', label: 'GOOD', color: '#27ae60' };
  if (depth === 5) return { status: 'attention', label: 'NEEDS ATTENTION', color: '#f1c40f' };
  return { status: 'replace', label: 'REPLACE NOW', color: '#e74c3c' };
};

// Stopping distance estimate based on tread depth
const getStoppingDistance = (depth) => {
  if (depth === null || depth === undefined) return null;
  if (depth >= 10) return 220;
  if (depth >= 6) return 260;
  if (depth === 5) return 300;
  if (depth >= 3) return 350;
  return 400;
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

// Styled Select Dropdown matching TireFinder exactly
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

// Styled Input matching TireFinder
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

// Small Tread Depth Input for the grid
const TreadDepthInput = ({ value, onChange, color }) => (
  <input
    type="number"
    min="0"
    max="12"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '45px',
      height: '40px',
      border: `2px solid ${color || '#9b59b6'}`,
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      textAlign: 'center',
      outline: 'none',
      color: color || '#333',
      backgroundColor: color ? color + '10' : 'white'
    }}
  />
);

// Get color for individual tread value
const getTreadColor = (val) => {
  if (val === '' || val === null || val === undefined) return '#9b59b6';
  const depth = parseInt(val);
  if (isNaN(depth)) return '#9b59b6';
  if (depth >= 6) return '#27ae60';
  if (depth === 5) return '#f1c40f';
  return '#e74c3c';
};

export default function QuoteBuilder() {
  // Get tire data from sessionStorage
  const [tireData, setTireData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);

  // Store selection - persist in localStorage
  const [selectedStore, setSelectedStore] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jl_tire_store') || '609';
    }
    return '609';
  });

  // Employee selection - persist in localStorage
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jl_quote_employee');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Customer lookup
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseState, setLicenseState] = useState('CA');
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [customerData, setCustomerData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    phone: '',
    email: '',
    vehicle_ymm: '',
    data_source: 'manual'
  });

  // Tread depth inputs - 3 readings per tire × 4 tires = 12 inputs
  // Each tire has: inside, middle, outside
  const [treadDepths, setTreadDepths] = useState({
    fl_inside: '', fl_middle: '', fl_outside: '',  // Front Left
    fr_inside: '', fr_middle: '', fr_outside: '',  // Front Right
    rl_inside: '', rl_middle: '', rl_outside: '',  // Rear Left
    rr_inside: '', rr_middle: '', rr_outside: '',  // Rear Right
  });

  // Quote options
  const [quantity, setQuantity] = useState(4);
  const [rebateAmount, setRebateAmount] = useState('');
  const [rebateDescription, setRebateDescription] = useState('');

  // Quote generation state
  const [generating, setGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [error, setError] = useState(null);

  // Update a single tread depth value
  const updateTread = (key, value) => {
    setTreadDepths(prev => ({ ...prev, [key]: value }));
  };

  // Calculate lowest tread depth across all 12 inputs
  const getLowestTread = () => {
    const allValues = Object.values(treadDepths)
      .filter(d => d !== '' && !isNaN(parseInt(d)))
      .map(d => parseInt(d));
    return allValues.length > 0 ? Math.min(...allValues) : null;
  };

  // Load tire data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTire = sessionStorage.getItem('jl_quote_tire');
      const savedVehicle = sessionStorage.getItem('jl_quote_vehicle');
      const savedQty = sessionStorage.getItem('jl_quote_qty');
      
      if (savedTire) setTireData(JSON.parse(savedTire));
      if (savedVehicle) setVehicleData(JSON.parse(savedVehicle));
      if (savedQty) setQuantity(parseInt(savedQty));
    }
  }, []);

  // Save store to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jl_tire_store', selectedStore);
    }
  }, [selectedStore]);

  // Save employee to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedEmployee) {
      localStorage.setItem('jl_quote_employee', JSON.stringify(selectedEmployee));
    }
  }, [selectedEmployee]);

  // Fetch employees when store changes
  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const response = await fetch(`${API_BASE}/employee-list?store_id=${selectedStore}&key=${API_KEY}`);
        const data = await response.json();
        if (data.success) {
          setEmployees(data.employees || []);
          if (selectedEmployee) {
            const stillValid = data.employees?.some(e => e.employee_id === selectedEmployee.employee_id);
            if (!stillValid) setSelectedEmployee(null);
          }
        }
      } catch (e) {
        console.error('Failed to fetch employees:', e);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, [selectedStore]);

  // Customer lookup by license plate
  const handleCustomerLookup = async () => {
    if (!licensePlate.trim()) return;
    
    setCustomerLookupLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/customer-lookup?plate=${encodeURIComponent(licensePlate)}&state=${licenseState}&key=${API_KEY}`
      );
      const data = await response.json();
      
      if (data.success && data.found) {
        setCustomerFound(true);
        setCustomerData({
          first_name: data.customer.first_name || '',
          last_name: data.customer.last_name || '',
          full_name: data.customer.full_name || '',
          phone: data.customer.phone || '',
          email: data.customer.email || '',
          vehicle_ymm: data.customer.vehicle_ymm || '',
          data_source: 'lookup'
        });
        if (data.customer.vehicle_ymm && !vehicleData?.display) {
          setVehicleData({ display: data.customer.vehicle_ymm });
        }
      } else {
        setCustomerFound(false);
        setCustomerData({
          first_name: '', last_name: '', full_name: '', phone: '', email: '', vehicle_ymm: '', data_source: 'manual'
        });
      }
    } catch (e) {
      console.error('Customer lookup failed:', e);
      setError('Failed to lookup customer');
    } finally {
      setCustomerLookupLoading(false);
    }
  };

  // Generate quote
  const handleGenerateQuote = async () => {
    if (!tireData || !selectedEmployee) {
      setError('Please select a tire and employee');
      return;
    }

    setGenerating(true);
    setError(null);

    const lowestTread = getLowestTread();

    try {
      const requestBody = {
        key: API_KEY,
        store_id: parseInt(selectedStore),
        employee: {
          user_id: selectedEmployee.user_id || selectedEmployee.employee_id,
          user_name: selectedEmployee.user_name || selectedEmployee.display_name
        },
        customer: {
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          full_name: customerData.full_name || `${customerData.first_name} ${customerData.last_name}`.trim(),
          phone: customerData.phone,
          email: customerData.email,
          license_plate: licensePlate || null,
          license_state: licensePlate ? licenseState : null,
          data_source: customerData.data_source
        },
        vehicle: vehicleData ? {
          year: vehicleData.year || null,
          make: vehicleData.make || null,
          model: vehicleData.model || null,
          submodel: vehicleData.submodel || null,
          display: vehicleData.display || null
        } : null,
        tread_depth: lowestTread !== null ? {
          front_left: {
            inside: treadDepths.fl_inside ? parseInt(treadDepths.fl_inside) : null,
            middle: treadDepths.fl_middle ? parseInt(treadDepths.fl_middle) : null,
            outside: treadDepths.fl_outside ? parseInt(treadDepths.fl_outside) : null,
          },
          front_right: {
            inside: treadDepths.fr_inside ? parseInt(treadDepths.fr_inside) : null,
            middle: treadDepths.fr_middle ? parseInt(treadDepths.fr_middle) : null,
            outside: treadDepths.fr_outside ? parseInt(treadDepths.fr_outside) : null,
          },
          rear_left: {
            inside: treadDepths.rl_inside ? parseInt(treadDepths.rl_inside) : null,
            middle: treadDepths.rl_middle ? parseInt(treadDepths.rl_middle) : null,
            outside: treadDepths.rl_outside ? parseInt(treadDepths.rl_outside) : null,
          },
          rear_right: {
            inside: treadDepths.rr_inside ? parseInt(treadDepths.rr_inside) : null,
            middle: treadDepths.rr_middle ? parseInt(treadDepths.rr_middle) : null,
            outside: treadDepths.rr_outside ? parseInt(treadDepths.rr_outside) : null,
          },
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
        quantity: quantity,
        rebate_amount: rebateAmount ? parseFloat(rebateAmount) : 0,
        rebate_description: rebateDescription || null
      };

      const response = await fetch(`${API_BASE}/generate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedQuote(data.quote);
        sessionStorage.removeItem('jl_quote_tire');
        sessionStorage.removeItem('jl_quote_vehicle');
        sessionStorage.removeItem('jl_quote_qty');
      } else {
        setError(data.error || 'Failed to generate quote');
      }
    } catch (e) {
      console.error('Quote generation failed:', e);
      setError('Failed to generate quote');
    } finally {
      setGenerating(false);
    }
  };

  // Handle email quote
  const handleEmailQuote = async () => {
    if (!generatedQuote) return;
    
    const email = customerData.email || prompt('Enter email address:');
    if (!email) return;

    try {
      const response = await fetch(`${API_BASE}/email-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          quote_id: generatedQuote.quote_id,
          email_override: email !== customerData.email ? email : null
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Quote emailed to ${data.emailed_to}`);
      } else {
        alert('Failed to send email: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to send email');
    }
  };

  // Handle print
  const handlePrint = () => {
    if (generatedQuote?.short_code) {
      window.open(`#/quote/${generatedQuote.short_code}`, '_blank');
    }
  };

  // Header Component
  const Header = () => (
    <>
      <header style={{ backgroundColor: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <img 
          src="https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-multicare-logo-color.png"
          alt="Jiffy Lube Multicare"
          style={{ height: '50px' }}
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-logo-white.png'; }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#333', fontSize: '13px', fontWeight: '600' }}>STORE:</span>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            style={{
              padding: '8px 30px 8px 15px',
              border: '2px solid #9b59b6',
              borderRadius: '20px',
              fontSize: '13px',
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
      </header>
      <nav style={{ backgroundColor: '#9b59b6', padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
        <a href="#/" style={{ color: 'white', textDecoration: 'none', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', padding: '5px 15px', borderRadius: '20px' }}>TIRE FINDER</a>
        <a href="#/inventory" style={{ color: 'white', textDecoration: 'none', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', padding: '5px 15px', borderRadius: '20px' }}>STORE INVENTORY</a>
      </nav>
    </>
  );

  // Footer Component
  const Footer = () => (
    <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px', marginTop: '30px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>© 2026 My Jiffy Lube Group. Tire data provided by MOTOR & USAutoForce.</p>
        <p style={{ fontSize: '11px', color: '#7f8c8d' }}>tires.myjiffylube.ai</p>
      </div>
    </footer>
  );

  // No tire data - show message
  if (!tireData) {
    return (
      <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '50px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: '15px' }}>No Tire Selected</h2>
            <p style={{ color: '#666', marginBottom: '25px' }}>Please select a tire from the Tire Finder to create a quote.</p>
            <a href="#/" style={{ backgroundColor: '#9b59b6', color: 'white', padding: '12px 30px', borderRadius: '25px', textDecoration: 'none', fontWeight: '600', display: 'inline-block' }}>Go to Tire Finder</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Quote generated - show success view
  if (generatedQuote) {
    return (
      <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
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
              <p style={{ margin: '0 0 10px 0' }}><strong>Size:</strong> {generatedQuote.tire?.size}</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#9b59b6' }}><strong>Total:</strong> {formatCurrency(generatedQuote.pricing?.total_before_rebate)}</p>
              {generatedQuote.pricing?.rebate_amount > 0 && (
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#27ae60' }}>After Rebate: {formatCurrency(generatedQuote.pricing?.total_after_rebate)}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '25px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Print Quote</button>
              <button onClick={handleEmailQuote} style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '25px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📧 Email to Customer</button>
            </div>

            <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <a href="#/" style={{ color: '#9b59b6', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>← Create Another Quote</a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate tread info for display
  const lowestTread = getLowestTread();
  const treadStatus = getTreadStatus(lowestTread);
  const stoppingDistance = getStoppingDistance(lowestTread);
  const consumerPrice = tireData.consumer_price || tireData.price || 0;

  // Tread Depth Row Component for the grid
  const TreadRow = ({ label, prefix }) => (
    <tr>
      <td style={{ padding: '8px 12px', fontWeight: '600', fontSize: '12px', color: '#333', backgroundColor: '#f8f9fa' }}>{label}</td>
      <td style={{ padding: '8px', textAlign: 'center' }}>
        <TreadDepthInput value={treadDepths[`${prefix}_inside`]} onChange={(v) => updateTread(`${prefix}_inside`, v)} color={getTreadColor(treadDepths[`${prefix}_inside`])} />
      </td>
      <td style={{ padding: '8px', textAlign: 'center' }}>
        <TreadDepthInput value={treadDepths[`${prefix}_middle`]} onChange={(v) => updateTread(`${prefix}_middle`, v)} color={getTreadColor(treadDepths[`${prefix}_middle`])} />
      </td>
      <td style={{ padding: '8px', textAlign: 'center' }}>
        <TreadDepthInput value={treadDepths[`${prefix}_outside`]} onChange={(v) => updateTread(`${prefix}_outside`, v)} color={getTreadColor(treadDepths[`${prefix}_outside`])} />
      </td>
    </tr>
  );

  // Main quote builder form
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', background: 'linear-gradient(180deg, #e8f4f8 0%, #d0e8f0 100%)' }}>
      <Header />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          {/* Title */}
          <h2 style={{ color: '#9b59b6', fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '3px' }}>
            CREATE QUOTE
          </h2>
          <p style={{ color: '#888', textAlign: 'center', fontSize: '13px', marginBottom: '30px', letterSpacing: '2px' }}>TIRE QUOTE BUILDER</p>

          {/* Selected Tire Card */}
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

          {/* Vehicle Info */}
          {vehicleData?.display && (
            <div style={{ backgroundColor: '#f8f4ff', border: '2px solid #9b59b6', borderRadius: '10px', padding: '15px 20px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🚗</span>
              <span style={{ fontWeight: '600', color: '#333', fontSize: '16px' }}>{vehicleData.display}</span>
            </div>
          )}

          {/* Two Column Layout */}
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            
            {/* Left Column - Employee & Customer */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              
              {/* Employee Section */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap' }}>QUOTE CREATED BY</span>
                </div>
                <SelectDropdown
                  value={selectedEmployee?.employee_id || ''}
                  onChange={(val) => {
                    const emp = employees.find(e => e.employee_id === parseInt(val));
                    setSelectedEmployee(emp || null);
                  }}
                  options={employees.map(e => ({ value: e.employee_id, label: e.display_name }))}
                  placeholder={employeesLoading ? "LOADING..." : "SELECT EMPLOYEE"}
                />
              </div>

              {/* Customer Lookup Section */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap' }}>CUSTOMER LOOKUP</span>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <StyledInput value={licensePlate} onChange={(val) => setLicensePlate(val.toUpperCase())} placeholder="LICENSE PLATE" style={{ flex: 1 }} onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()} />
                  <SelectDropdown value={licenseState} onChange={setLicenseState} options={US_STATES} placeholder="ST" style={{ width: '90px', minWidth: '90px' }} />
                  <button onClick={handleCustomerLookup} disabled={!licensePlate.trim() || customerLookupLoading} style={{ backgroundColor: licensePlate.trim() ? '#9b59b6' : '#ccc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', fontSize: '12px', fontWeight: '700', cursor: licensePlate.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                    {customerLookupLoading ? '...' : '🔍 LOOKUP'}
                  </button>
                </div>

                {customerFound && (
                  <div style={{ backgroundColor: '#f0fff4', border: '1px solid #27ae60', borderRadius: '10px', padding: '12px 15px', marginBottom: '15px', fontSize: '12px', color: '#27ae60', fontWeight: '600' }}>
                    ✓ Customer found! Info loaded below. You can edit if needed.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <StyledInput value={customerData.first_name} onChange={(v) => setCustomerData({...customerData, first_name: v})} placeholder="FIRST NAME" />
                  <StyledInput value={customerData.last_name} onChange={(v) => setCustomerData({...customerData, last_name: v})} placeholder="LAST NAME" />
                  <StyledInput value={customerData.phone} onChange={(v) => setCustomerData({...customerData, phone: v})} placeholder="PHONE" />
                  <StyledInput value={customerData.email} onChange={(v) => setCustomerData({...customerData, email: v})} placeholder="EMAIL" />
                </div>
              </div>

              {/* Quote Options Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                  </div>
                  <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap' }}>QUOTE OPTIONS</span>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ width: '80px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', textAlign: 'center', letterSpacing: '1px' }}>QTY</label>
                    <SelectDropdown value={quantity} onChange={(v) => setQuantity(parseInt(v))} options={QTY_OPTIONS} placeholder="QTY" />
                  </div>
                  <div style={{ flex: '1', minWidth: '100px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', textAlign: 'center', letterSpacing: '1px' }}>REBATE $</label>
                    <StyledInput type="number" min="0" step="0.01" value={rebateAmount} onChange={setRebateAmount} placeholder="0.00" />
                  </div>
                  <div style={{ flex: '2', minWidth: '150px' }}>
                    <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', textAlign: 'center', letterSpacing: '1px' }}>REBATE DESCRIPTION</label>
                    <StyledInput value={rebateDescription} onChange={setRebateDescription} placeholder="e.g., Nexen Spring Rebate" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tread Depth Grid */}
            <div style={{ flex: '1', minWidth: '320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', whiteSpace: 'nowrap' }}>CURRENT TREAD DEPTH (32nds)</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginLeft: '8px', position: 'relative' }}>
                  <div style={{ position: 'absolute', right: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                </div>
              </div>

              {/* Tread Depth Grid - 4 tires × 3 readings */}
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '15px', padding: '20px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px' }}></th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px' }}>IN</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px' }}>MID</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px' }}>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TreadRow label="FRONT LEFT" prefix="fl" />
                    <TreadRow label="FRONT RIGHT" prefix="fr" />
                    <TreadRow label="REAR LEFT" prefix="rl" />
                    <TreadRow label="REAR RIGHT" prefix="rr" />
                  </tbody>
                </table>

                {/* Tread Status Display */}
                {lowestTread !== null && (
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: treadStatus?.color + '15', border: `2px solid ${treadStatus?.color}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: treadStatus?.color }}>{lowestTread}/32"</span>
                      <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: '700', color: treadStatus?.color, backgroundColor: treadStatus?.color + '20', padding: '4px 12px', borderRadius: '15px' }}>{treadStatus?.label}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>
                      <div>Your stopping: <strong>~{stoppingDistance}ft</strong></div>
                      <div>New tires: <strong>~220ft</strong></div>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '10px' }}>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#27ae60', borderRadius: '3px', marginRight: '5px', verticalAlign: 'middle' }}></span> 6+ Good</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f1c40f', borderRadius: '3px', marginRight: '5px', verticalAlign: 'middle' }}></span> 5 Attention</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#e74c3c', borderRadius: '3px', marginRight: '5px', verticalAlign: 'middle' }}></span> &lt;5 Replace</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{ backgroundColor: '#fee', border: '1px solid #e74c3c', borderRadius: '10px', padding: '15px 20px', marginTop: '25px', color: '#c0392b', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div style={{ textAlign: 'center', marginTop: '35px' }}>
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
                boxShadow: generating || !selectedEmployee ? 'none' : '0 4px 15px rgba(155, 89, 182, 0.3)',
                transition: 'all 0.3s ease',
              }}
            >
              {generating ? 'GENERATING...' : 'GENERATE QUOTE'}
            </button>
            {!selectedEmployee && (
              <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px' }}>Please select an employee to continue</p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
