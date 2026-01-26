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

// Navigation items
const NAV_ITEMS = [
  { label: 'TIRE FINDER', href: '#/', active: false },
  { label: 'STORE INVENTORY', href: '#/inventory', active: false },
];

export default function QuoteBuilder() {
  // Get tire data from URL hash params or sessionStorage
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

  // Tread depth inputs
  const [treadInside, setTreadInside] = useState('');
  const [treadMiddle, setTreadMiddle] = useState('');
  const [treadOutside, setTreadOutside] = useState('');

  // Quote options
  const [quantity, setQuantity] = useState(4);
  const [rebateAmount, setRebateAmount] = useState('');
  const [rebateDescription, setRebateDescription] = useState('');

  // Quote generation state
  const [generating, setGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [error, setError] = useState(null);

  // Load tire data from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTire = sessionStorage.getItem('jl_quote_tire');
      const savedVehicle = sessionStorage.getItem('jl_quote_vehicle');
      const savedQty = sessionStorage.getItem('jl_quote_qty');
      
      if (savedTire) {
        setTireData(JSON.parse(savedTire));
      }
      if (savedVehicle) {
        setVehicleData(JSON.parse(savedVehicle));
      }
      if (savedQty) {
        setQuantity(parseInt(savedQty));
      }
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
          // Check if saved employee is still valid for this store
          if (selectedEmployee) {
            const stillValid = data.employees?.some(e => e.user_id === selectedEmployee.user_id);
            if (!stillValid) {
              setSelectedEmployee(null);
            }
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
        // If we got vehicle from customer lookup and don't have one already, use it
        if (data.customer.vehicle_ymm && !vehicleData?.display) {
          setVehicleData({ display: data.customer.vehicle_ymm });
        }
      } else {
        setCustomerFound(false);
        setCustomerData({
          first_name: '',
          last_name: '',
          full_name: '',
          phone: '',
          email: '',
          vehicle_ymm: '',
          data_source: 'manual'
        });
      }
    } catch (e) {
      console.error('Customer lookup failed:', e);
      setError('Failed to lookup customer');
    } finally {
      setCustomerLookupLoading(false);
    }
  };

  // Calculate lowest tread depth
  const getLowestTread = () => {
    const depths = [treadInside, treadMiddle, treadOutside]
      .filter(d => d !== '' && !isNaN(parseInt(d)))
      .map(d => parseInt(d));
    return depths.length > 0 ? Math.min(...depths) : null;
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
          user_id: selectedEmployee.user_id,
          user_name: selectedEmployee.user_name
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
          inside: treadInside ? parseInt(treadInside) : null,
          middle: treadMiddle ? parseInt(treadMiddle) : null,
          outside: treadOutside ? parseInt(treadOutside) : null
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
        // Clear sessionStorage after successful quote
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

  // No tire data - show message
  if (!tireData) {
    return (
      <div style={{ 
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f5f6fa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#9b59b6', marginBottom: '15px' }}>No Tire Selected</h2>
          <p style={{ color: '#666', marginBottom: '25px' }}>
            Please select a tire from the Tire Finder to create a quote.
          </p>
          <a 
            href="#/"
            style={{
              backgroundColor: '#9b59b6',
              color: 'white',
              padding: '12px 30px',
              borderRadius: '25px',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            Go to Tire Finder
          </a>
        </div>
      </div>
    );
  }

  // Quote generated - show success view
  if (generatedQuote) {
    const lowestTread = getLowestTread();
    const treadStatus = getTreadStatus(lowestTread);
    
    return (
      <div style={{ 
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f5f6fa',
      }}>
        {/* Header */}
        <header style={{ 
          backgroundColor: '#cc0000', 
          padding: '15px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img 
                src="https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-logo-white.png"
                alt="Jiffy Lube"
                style={{ height: '35px' }}
              />
              <span style={{ color: 'white', fontSize: '16px', fontWeight: '600', letterSpacing: '1px' }}>
                TIRE QUOTES
              </span>
            </div>
          </div>
        </header>

        {/* Success Content */}
        <div style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>✅</div>
            <h2 style={{ color: '#27ae60', marginBottom: '10px' }}>Quote Created!</h2>
            <p style={{ color: '#666', marginBottom: '5px' }}>
              Quote Number: <strong>{generatedQuote.quote_number}</strong>
            </p>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '13px' }}>
              Expires: {new Date(generatedQuote.expires_at).toLocaleDateString()}
            </p>

            {/* Quote Summary */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Customer:</strong> {generatedQuote.customer?.name || 'Not provided'}
              </p>
              {generatedQuote.vehicle && (
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong>Vehicle:</strong> {generatedQuote.vehicle}
                </p>
              )}
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Tire:</strong> {generatedQuote.tire?.brand} {generatedQuote.tire?.name}
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Size:</strong> {generatedQuote.tire?.size}
              </p>
              <p style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#9b59b6' }}>
                <strong>Total:</strong> {formatCurrency(generatedQuote.pricing?.total_before_rebate)}
              </p>
              {generatedQuote.pricing?.rebate_amount > 0 && (
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#27ae60' }}>
                  After Rebate: {formatCurrency(generatedQuote.pricing?.total_after_rebate)}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrint}
                style={{
                  backgroundColor: '#9b59b6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '25px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🖨️ Print Quote
              </button>
              <button
                onClick={handleEmailQuote}
                style={{
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '25px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📧 Email to Customer
              </button>
            </div>

            {/* Create Another */}
            <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <a 
                href="#/"
                style={{
                  color: '#9b59b6',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ← Create Another Quote
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate tread info
  const lowestTread = getLowestTread();
  const treadStatus = getTreadStatus(lowestTread);
  const stoppingDistance = getStoppingDistance(lowestTread);

  // Main quote builder form
  return (
    <div style={{ 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      minHeight: '100vh',
      backgroundColor: '#f5f6fa',
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#cc0000', 
        padding: '15px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="https://www.jiffylube.com/-/media/images/jiffylube/logos/jl-logo-white.png"
              alt="Jiffy Lube"
              style={{ height: '35px' }}
            />
            <span style={{ color: 'white', fontSize: '16px', fontWeight: '600', letterSpacing: '1px' }}>
              CREATE QUOTE
            </span>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: '20px' }}>
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '1px',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Store Selector */}
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            style={{
              padding: '8px 15px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {STORES.map(store => (
              <option key={store.id} value={store.id} style={{ color: '#333' }}>
                {store.id} - {store.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        
        {/* Selected Tire Card */}
        <div style={{
          backgroundColor: '#9b59b6',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>
                {tireData.brand || tireData.brand_code} {tireData.name || tireData.sales_class}
              </h3>
              <p style={{ margin: '0', opacity: 0.9, fontSize: '14px' }}>
                {tireData.tire_size || tireData.size} | Part#: {tireData.part_number}
              </p>
              {tireData.warranty && (
                <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '12px' }}>
                  ✓ {parseInt(tireData.warranty).toLocaleString()} Mile Warranty
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {formatCurrency(tireData.consumer_price || tireData.price)}
              </div>
              {tireData.fet > 0 && (
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  + {formatCurrency(parseFloat(tireData.fet))} FET
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Info (if available) */}
        {vehicleData?.display && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '15px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>🚗</span>
            <span style={{ fontWeight: '600', color: '#333' }}>{vehicleData.display}</span>
          </div>
        )}

        {/* Form Sections */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '25px',
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          
          {/* Section: Employee */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>
              QUOTE CREATED BY
            </h4>
            <select
              value={selectedEmployee?.user_id || ''}
              onChange={(e) => {
                const emp = employees.find(emp => emp.user_id === parseInt(e.target.value));
                setSelectedEmployee(emp || null);
              }}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #9b59b6',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.display_name} ({emp.user_name})
                </option>
              ))}
            </select>
            {employeesLoading && <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Loading employees...</p>}
          </div>

          {/* Section: Customer Lookup */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>
              CUSTOMER LOOKUP
            </h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="License Plate"
                style={{
                  flex: '1',
                  minWidth: '150px',
                  padding: '12px 15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()}
              />
              <select
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                style={{
                  padding: '12px 15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <button
                onClick={handleCustomerLookup}
                disabled={!licensePlate.trim() || customerLookupLoading}
                style={{
                  backgroundColor: '#9b59b6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: licensePlate.trim() ? 'pointer' : 'not-allowed',
                  opacity: licensePlate.trim() ? 1 : 0.5
                }}
              >
                {customerLookupLoading ? '...' : '🔍 Lookup'}
              </button>
            </div>

            {customerFound && (
              <div style={{
                backgroundColor: '#f0fff4',
                border: '1px solid #27ae60',
                borderRadius: '8px',
                padding: '10px 15px',
                marginBottom: '15px',
                fontSize: '13px',
                color: '#27ae60'
              }}>
                ✓ Customer found! Info loaded below. You can edit if needed.
              </div>
            )}

            {/* Customer Info Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  FIRST NAME
                </label>
                <input
                  type="text"
                  value={customerData.first_name}
                  onChange={(e) => setCustomerData({...customerData, first_name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  LAST NAME
                </label>
                <input
                  type="text"
                  value={customerData.last_name}
                  onChange={(e) => setCustomerData({...customerData, last_name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  PHONE
                </label>
                <input
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section: Tread Depth */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>
              CURRENT TREAD DEPTH (Optional)
            </h4>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  INSIDE
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={treadInside}
                  onChange={(e) => setTreadInside(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  MIDDLE
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={treadMiddle}
                  onChange={(e) => setTreadMiddle(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  OUTSIDE
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={treadOutside}
                  onChange={(e) => setTreadOutside(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
              
              {/* Tread Status Display */}
              {lowestTread !== null && (
                <div style={{
                  flex: '1',
                  minWidth: '200px',
                  backgroundColor: treadStatus?.color + '15',
                  border: `2px solid ${treadStatus?.color}`,
                  borderRadius: '8px',
                  padding: '10px 15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: treadStatus?.color }}>
                      {lowestTread}/32"
                    </span>
                    <span style={{ 
                      marginLeft: '10px', 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      color: treadStatus?.color 
                    }}>
                      {treadStatus?.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>
                    <div>Your stopping: ~{stoppingDistance}ft</div>
                    <div>New tires: ~220ft</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Quote Options */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: '14px', fontWeight: '700', letterSpacing: '1px' }}>
              QUOTE OPTIONS
            </h4>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  QUANTITY
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  style={{
                    padding: '10px 20px',
                    border: '2px solid #9b59b6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                >
                  {QTY_OPTIONS.map(qty => (
                    <option key={qty} value={qty}>{qty}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  REBATE AMOUNT (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rebateAmount}
                  onChange={(e) => setRebateAmount(e.target.value)}
                  placeholder="$0.00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: '2', minWidth: '200px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                  REBATE DESCRIPTION
                </label>
                <input
                  type="text"
                  value={rebateDescription}
                  onChange={(e) => setRebateDescription(e.target.value)}
                  placeholder="e.g., Nexen Spring Rebate"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #e74c3c',
              borderRadius: '8px',
              padding: '12px 15px',
              marginBottom: '20px',
              color: '#c0392b',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateQuote}
            disabled={generating || !selectedEmployee}
            style={{
              width: '100%',
              backgroundColor: generating ? '#ccc' : '#27ae60',
              color: 'white',
              border: 'none',
              padding: '16px 30px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: generating || !selectedEmployee ? 'not-allowed' : 'pointer',
              letterSpacing: '1px'
            }}
          >
            {generating ? 'GENERATING...' : 'GENERATE QUOTE'}
          </button>
        </div>
      </div>
    </div>
  );
}
