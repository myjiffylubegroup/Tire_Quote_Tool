import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { apiCall } from './apiClient';

import { API_BASE, REST_BASE, SUPABASE_ANON_KEY } from './config';

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
const QTY_OPTIONS = [1, 2, 3, 4, 5, 6];

// Promo options - matches quote_config in database
const PROMOS = [
  { id: 'FREE_INSTALL', name: 'Free Installation' },
  { id: '10PCT_TIRES', name: '10% Off Tires' },
  { id: 'NEXEN_B3G1', name: 'Buy 3 Nexen Get 1 Free' },
  { id: 'MILITARY_15', name: 'Military Discount (15%)' },
  { id: 'FIRST_RESP_12', name: 'First Responder (12%)' },
  { id: 'SENIOR_12', name: 'Senior 55+ (12%)' },
];

// Nexen rebate config is loaded from quote_config at runtime (key: nexen_rebate_2026)

// Updated thresholds: 0-4 red, 5-6 yellow, 7+ green
const getTreadColor = (val) => {
  if (val === '' || val === null || val === undefined) return '#9b59b6';
  const depth = parseInt(val);
  if (isNaN(depth)) return '#9b59b6';
  if (depth >= 7) return '#27ae60';  // Green: 7+
  if (depth >= 5) return '#f1c40f';  // Yellow: 5-6
  return '#e74c3c';                   // Red: 0-4
};

// Tire replacement reasons beyond tread depth
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
const PhoneInput = ({ value, onChange, onBlur, placeholder, style }) => {
  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
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

// Tire tread block - 3 inputs (IN/MID/OUT) for one tire + replacement reasons
const TireTreadBlock = ({ label, values, onChange, reasons, onReasonsChange }) => {
  const [showReasons, setShowReasons] = useState(reasons && reasons.length > 0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  
  // Sync showReasons with incoming reasons prop (e.g. re-quote pre-fill)
  React.useEffect(() => {
    if (reasons && reasons.length > 0) setShowReasons(true);
  }, [reasons]);

  // Click outside to close dropdown
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const toggleReason = (code) => {
    const current = reasons || [];
    const updated = current.includes(code) 
      ? current.filter(r => r !== code) 
      : [...current, code];
    onReasonsChange(updated);
  };

  const handleCheckboxChange = (checked) => {
    setShowReasons(checked);
    if (checked) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
      onReasonsChange([]);
    }
  };

  // Short labels for the badges
  const SHORT_LABELS = {
    sidewall_damage: 'Sidewall',
    sidewall_bulge: 'Bulge/Delam',
    belt_separation: 'Belt Sep.',
    bead_damage: 'Bead Dmg',
    tread_damage: 'Tread Dmg',
    uneven_wear: 'Uneven Wear',
    flat_spot: 'Flat Spot',
    unrepairable_puncture: 'Puncture',
    improper_repair: 'Bad Repair',
    dry_rot: 'Dry Rot',
    age: 'Age 8+',
    driven_flat: 'Driven Flat',
    road_hazard_impact: 'Curb/Impact',
    mismatched: 'Mismatched',
    axle_match: 'Axle Match',
    awd_match: 'AWD Match'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
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
      {/* Replacement reason checkbox */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginTop: '3px' }}>
        <input 
          type="checkbox" 
          checked={showReasons} 
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#e74c3c' }} 
        />
        <span style={{ fontSize: '10px', color: '#e74c3c', fontWeight: '700' }}>⚠️ Issue</span>
      </label>
      {/* Selected reason badges */}
      {showReasons && (reasons || []).length > 0 && !dropdownOpen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'center', maxWidth: '120px', cursor: 'pointer' }} onClick={() => setDropdownOpen(true)}>
          {(reasons || []).map(code => (
            <span key={code} style={{
              fontSize: '8px', fontWeight: '600', color: '#fff', backgroundColor: '#e74c3c',
              borderRadius: '8px', padding: '1px 6px', whiteSpace: 'nowrap'
            }}>
              {SHORT_LABELS[code] || code}
            </span>
          ))}
        </div>
      )}
      {/* Multi-select dropdown */}
      {dropdownOpen && (
        <div ref={dropdownRef} style={{ 
          position: 'absolute', 
          zIndex: 20, 
          top: '100%',
          marginTop: '4px',
          background: 'white', 
          border: '2px solid #e74c3c', 
          borderRadius: '8px', 
          padding: '8px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          width: '220px',
          maxHeight: '220px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#e74c3c', marginBottom: '6px', textAlign: 'center' }}>
            SELECT REASON(S)
          </div>
          {REPLACEMENT_REASON_OPTIONS.map(opt => (
            <label key={opt.code} style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 5px', 
              cursor: 'pointer', fontSize: '11px', color: '#333',
              borderRadius: '4px',
              backgroundColor: (reasons || []).includes(opt.code) ? '#fef2f2' : 'transparent'
            }}>
              <input 
                type="checkbox" 
                checked={(reasons || []).includes(opt.code)} 
                onChange={() => toggleReason(opt.code)}
                style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: '#e74c3c', flexShrink: 0 }}
              />
              {opt.label}
            </label>
          ))}
          <button 
            onClick={() => setDropdownOpen(false)}
            style={{
              width: '100%', marginTop: '8px', padding: '6px', 
              backgroundColor: '#e74c3c', color: 'white', border: 'none', 
              borderRadius: '5px', fontSize: '11px', fontWeight: '700', 
              cursor: 'pointer', letterSpacing: '0.5px'
            }}
          >
            ✓ DONE
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// CUSTOMER SEARCH MODAL
// ============================================
const CustomerSearchModal = ({ isOpen, onClose, onSelectCustomer }) => {
  const [searchType, setSearchType] = useState('name'); // 'name' or 'phone'
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchType('name');
      setSearchValue('');
      setResults([]);
      setSearched(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setSearching(true);
    setError(null);
    setResults([]);
    setSearched(false);

    try {
      let url = `${API_BASE}/customer-lookup?search_type=${searchType}`;

      if (searchType === 'name') {
        url += `&last_name=${encodeURIComponent(searchValue.trim())}`;
      } else if (searchType === 'phone') {
        const phoneDigits = searchValue.replace(/\D/g, '');
        url += `&phone=${encodeURIComponent(phoneDigits)}`;
      }

      const response = await apiCall(url);
      const data = await response.json();

      if (data.success) {
        setSearched(true);
        if (data.found) {
          // Could be single customer or array of customers
          if (data.customers) {
            setResults(data.customers);
          } else if (data.customer) {
            setResults([data.customer]);
          }
        } else {
          setResults([]);
        }
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (e) {
      setError('Failed to search customers');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '30px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#9b59b6', fontSize: '18px', fontWeight: '700', letterSpacing: '1px' }}>
            ADVANCED CUSTOMER SEARCH
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        {/* Search Type Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={() => { setSearchType('name'); setSearchValue(''); setResults([]); setSearched(false); }}
            style={{
              flex: 1,
              padding: '10px',
              border: `2px solid ${searchType === 'name' ? '#9b59b6' : '#ddd'}`,
              borderRadius: '25px',
              backgroundColor: searchType === 'name' ? '#9b59b6' : 'white',
              color: searchType === 'name' ? 'white' : '#666',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            BY LAST NAME
          </button>
          <button
            onClick={() => { setSearchType('phone'); setSearchValue(''); setResults([]); setSearched(false); }}
            style={{
              flex: 1,
              padding: '10px',
              border: `2px solid ${searchType === 'phone' ? '#9b59b6' : '#ddd'}`,
              borderRadius: '25px',
              backgroundColor: searchType === 'phone' ? '#9b59b6' : 'white',
              color: searchType === 'phone' ? 'white' : '#666',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            BY PHONE
          </button>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {searchType === 'phone' ? (
            <PhoneInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder="(805) 555-1234"
              style={{ flex: 1 }}
            />
          ) : (
            <StyledInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Enter last name..."
              style={{ flex: 1, textTransform: 'none' }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          )}
          <button
            onClick={handleSearch}
            disabled={!searchValue.trim() || searching}
            style={{
              backgroundColor: searchValue.trim() && !searching ? '#9b59b6' : '#ccc',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '25px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: searchValue.trim() && !searching ? 'pointer' : 'not-allowed',
              minWidth: '100px'
            }}
          >
            {searching ? 'SEARCHING...' : 'SEARCH'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #e74c3c',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '15px',
            color: '#c0392b',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
          {searched && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
              <p style={{ margin: 0, fontSize: '13px' }}>No customers found</p>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px', fontWeight: '600' }}>
                {results.length} RESULT{results.length !== 1 ? 'S' : ''} FOUND
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.map((customer, idx) => (
                  <button
                    key={customer.vehicle_customer_id || idx}
                    onClick={() => handleSelect(customer)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 15px',
                      border: '2px solid #eee',
                      borderRadius: '10px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9b59b6';
                      e.currentTarget.style.backgroundColor = '#faf5fc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#eee';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#333', fontSize: '14px', marginBottom: '4px' }}>
                          {customer.full_name || `${customer.first_name} ${customer.last_name}`.trim() || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {customer.phone && <span>{customer.phone}</span>}
                          {customer.phone && customer.email && <span> • </span>}
                          {customer.email && <span>{customer.email}</span>}
                        </div>
                        {customer.vehicle_ymm && (
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                            🚗 {customer.vehicle_ymm}
                          </div>
                        )}
                      </div>
                      {customer.license_plate && (
                        <div style={{
                          backgroundColor: '#f0f0f0',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#666'
                        }}>
                          {customer.license_state} {customer.license_plate}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#999' }}>
            Click a customer to select them for the quote
          </span>
        </div>
      </div>
    </div>
  );
};

// Footer Component
const Footer = () => (
  <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '12px' }}>
        <a href="#/about" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>About Us</a>
        <a href="#/contact" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Contact</a>
        <a href="#/privacy-policy" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Privacy Policy</a>
        <a href="#/terms" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Terms & Conditions</a>
        <a href="#/sms-consent" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>SMS Terms</a>
        <a href="#/do-not-sell" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px' }}>Do Not Sell My Info</a>
      </div>
      <p style={{ fontSize: '13px', marginBottom: '8px' }}>
        © 2026 P.C.J.L., Inc. Tire data provided by MOTOR & USAutoForce.
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
  const [selectedStore, setSelectedStore] = useState(() => {
    // Re-quote store takes priority (only if data hasn't been consumed yet)
    try {
      const rqData = sessionStorage.getItem('jl_requote_data');
      if (rqData) {
        const parsed = JSON.parse(rqData);
        if (parsed.store_id) return parsed.store_id.toString();
      }
    } catch (e) { /* fall through */ }
    return localStorage.getItem('jl_tire_store') || '609';
  });
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

  // SMS opt-out warning
  const [smsOptedOut, setSmsOptedOut] = useState(null); // null = unchecked, { opted_out, store_number } if opted out

  // Advanced search modal state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Tread depths: 4 tires × 3 readings each
  const [treadDepths, setTreadDepths] = useState({
    lf: { inside: '', middle: '', outside: '' },
    rf: { inside: '', middle: '', outside: '' },
    lr: { inside: '', middle: '', outside: '' },
    rr: { inside: '', middle: '', outside: '' },
  });

  // Per-tire replacement reasons beyond tread depth
  const [replacementReasons, setReplacementReasons] = useState({
    lf: [], rf: [], lr: [], rr: []
  });

  const updateReasons = (tire, reasons) => {
    setReplacementReasons(prev => ({ ...prev, [tire]: reasons }));
  };

  const hasAnyReasons = () => {
    return Object.values(replacementReasons).some(r => r.length > 0);
  };

  const [quantity, setQuantity] = useState(4);
  const [selectedPromo, setSelectedPromo] = useState('');
  const [rebateAmount, setRebateAmount] = useState('');
  const [rebateDescription, setRebateDescription] = useState('');
  const [rebateDismissed, setRebateDismissed] = useState(false); // CSA manually cleared rebate
  const [nexenRebateConfig, setNexenRebateConfig] = useState(null); // Loaded from quote_config
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Alternative tire options (good/best) - loaded from sessionStorage (set by TireFinder)
  const [altGoodTire, setAltGoodTire] = useState(null);
  const [altBestTire, setAltBestTire] = useState(null);

  // Staggered fitment (different front/rear tires)
  const [isStaggered, setIsStaggered] = useState(false);
  const [rearTireData, setRearTireData] = useState(null);
  const [quantityFront, setQuantityFront] = useState(2);
  const [quantityRear, setQuantityRear] = useState(2);

  // Custom quote mode - for manual tire entry
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTire, setCustomTire] = useState({
    brand: '', name: '', size: '', load_rating: '', speed_rating: '', price: '', fet: ''
  });

  // Revision tracking
  const [revisedFromQuoteId, setRevisedFromQuoteId] = useState(null);
  // Greet linkage (Phase 2) — read from sessionStorage on mount (set by
  // TireFinder's greet handoff), sent on generate so the quote links back to
  // the originating greet. Pairs short_code + store_id.
  const [greetLink, setGreetLink] = useState(null);
  const [reviseLoading, setReviseLoading] = useState(false);

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
    // Detect custom quote mode from URL hash
    const hash = window.location.hash || '';
    const isCustom = hash.includes('mode=custom');
    setIsCustomMode(isCustom);

    if (!isCustom) {
      const savedTire = sessionStorage.getItem('jl_quote_tire');
      const savedVehicle = sessionStorage.getItem('jl_quote_vehicle');
      const savedQty = sessionStorage.getItem('jl_quote_qty');
      if (savedTire) { setTireData(JSON.parse(savedTire)); setRebateDismissed(false); }
      if (savedVehicle) setVehicleData(JSON.parse(savedVehicle));
      if (savedQty) setQuantity(parseInt(savedQty));

      // Load alt tires from TireFinder selection
      const savedGood = sessionStorage.getItem('jl_quote_alt_good');
      const savedBest = sessionStorage.getItem('jl_quote_alt_best');
      if (savedGood) setAltGoodTire(JSON.parse(savedGood));
      if (savedBest) setAltBestTire(JSON.parse(savedBest));

      // Load staggered fitment data from TireFinder
      const savedStaggered = sessionStorage.getItem('jl_quote_staggered');
      const savedRearTire = sessionStorage.getItem('jl_quote_tire_rear');
      if (savedStaggered === 'true' && savedRearTire) {
        setIsStaggered(true);
        setRearTireData(JSON.parse(savedRearTire));
        // Default 2 front + 2 rear for staggered
        setQuantityFront(2);
        setQuantityRear(2);
        setQuantity(4);
        // No alt tires for staggered
        setAltGoodTire(null);
        setAltBestTire(null);
      }

      // Auto-populate customer fields if passed from TireFinder plate lookup
      const savedCustomer = sessionStorage.getItem('jl_quote_customer');
      if (savedCustomer) {
        try {
          const customer = JSON.parse(savedCustomer);
          setCustomerFound(true);
          setCustomerData({
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            full_name: customer.full_name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            vehicle_ymm: '',
            data_source: 'lookup'
          });
          if (customer.license_plate) {
            setLicensePlate(customer.license_plate);
            if (customer.license_state) {
              setLicenseState(customer.license_state);
            }
          }
          // Clean up so it doesn't persist to next quote
          sessionStorage.removeItem('jl_quote_customer');
        } catch (e) {
          console.error('Failed to parse saved customer data:', e);
        }
      }
    }
  }, []);

  // Greet link read (Phase 2). Set by TireFinder's greet handoff; consumed
  // once here. Sent on generate so the quote stamps from_greet_* and links
  // back to the originating greet.
  useEffect(() => {
    const gl = sessionStorage.getItem('jl_quote_greet_link');
    if (!gl) return;
    sessionStorage.removeItem('jl_quote_greet_link');
    try {
      setGreetLink(JSON.parse(gl));
    } catch (e) {
      console.error('Failed to parse greet link:', e);
    }
  }, []);

  useEffect(() => { localStorage.setItem('jl_tire_store', selectedStore); }, [selectedStore]);
  useEffect(() => { if (selectedEmployee) localStorage.setItem('jl_quote_employee', JSON.stringify(selectedEmployee)); }, [selectedEmployee]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const response = await apiCall(`${API_BASE}/employee-list?store_id=${selectedStore}`);
        const data = await response.json();
        if (data.success) {
          setEmployees(data.employees || []);
          
          // If current selection is not in the new store's list, clear it
          if (selectedEmployee && !data.employees?.some(e => e.employee_id === selectedEmployee.employee_id)) {
            setSelectedEmployee(null);
          }
          
          // Auto-select logged-in employee if no employee is currently selected
          if (!selectedEmployee && data.employees?.length > 0) {
            try {
              const authData = localStorage.getItem('jl_staff_auth');
              if (authData) {
                const auth = JSON.parse(authData);
                if (auth.employee_id) {
                  const loggedInEmp = data.employees.find(e => e.employee_id === auth.employee_id);
                  if (loggedInEmp) {
                    setSelectedEmployee(loggedInEmp);
                  }
                }
              }
            } catch (e) { /* ignore auth parse errors */ }
          }
        }
      } catch (e) { console.error('Failed to fetch employees:', e); }
      finally { setEmployeesLoading(false); }
    };
    fetchEmployees();
  }, [selectedStore]);

  // Fetch Nexen rebate config from quote_config
  useEffect(() => {
    const fetchRebateConfig = async () => {
      try {
        // Read rebate config via Supabase REST through v_public_config —
        // quote_config itself is locked to anon (it held staff PINs); the
        // view exposes only explicitly public keys.
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
          setNexenRebateConfig(configData[0].config_value);
        }
      } catch (e) {
        console.error('Failed to fetch Nexen rebate config:', e);
      }
    };
    fetchRebateConfig();
  }, []);

  // Auto-detect and apply Nexen rebate when tire or quantity changes
  useEffect(() => {
    // If CSA manually dismissed, don't re-apply
    if (rebateDismissed) return;

    // Need config loaded and a tire selected
    if (!nexenRebateConfig || !tireData) {
      setRebateAmount('');
      setRebateDescription('');
      return;
    }

    const cfg = nexenRebateConfig;

    // Respect config active flag
    if (cfg.active === false) {
      setRebateAmount('');
      setRebateDescription('');
      return;
    }

    // Check date window — compare YYYY-MM-DD strings in Pacific time.
    // (new Date('YYYY-MM-DD') parses as UTC midnight, which is the PREVIOUS
    // day 5pm Pacific — the old check ended offers a day early.)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    if (!cfg.start_date || !cfg.end_date || today < cfg.start_date || today > cfg.end_date) {
      setRebateAmount('');
      setRebateDescription('');
      return;
    }

    // Check minimum quantity
    if (quantity < cfg.min_qty) {
      setRebateAmount('');
      setRebateDescription('');
      return;
    }

    // Get the tire's sales_class — this is the field we match against
    const tireSalesClass = tireData.sales_class || '';

    // Find matching tier by exact sales_class match
    const matchedTier = cfg.tiers.find(tier =>
      tier.sales_classes.includes(tireSalesClass)
    );

    if (matchedTier) {
      setRebateAmount(matchedTier.amount.toString());
      setRebateDescription(matchedTier.description);
    } else {
      setRebateAmount('');
      setRebateDescription('');
    }
  }, [tireData, quantity, nexenRebateConfig, rebateDismissed]);

  // Re-Quote pre-fill: detect jl_requote_data in sessionStorage (set by QuoteLookup or QuoteView)
  useEffect(() => {
    const saved = sessionStorage.getItem('jl_requote_data');
    console.log('[RE-QUOTE] sessionStorage jl_requote_data:', saved ? 'FOUND' : 'NOT FOUND');
    if (!saved) return;

    try {
      const rq = JSON.parse(saved);
      console.log('[RE-QUOTE] Parsed data:', JSON.stringify({ from_quote_id: rq.from_quote_id, hasCustomer: !!rq.customer, hasTreads: !!rq.treads, store_id: rq.store_id }));
      setRevisedFromQuoteId(rq.from_quote_id);

      // Pre-fill customer
      if (rq.customer) {
        setCustomerData({
          first_name: rq.customer.first_name || '',
          last_name: rq.customer.last_name || '',
          full_name: rq.customer.full_name || '',
          phone: rq.customer.phone ? formatPhoneNumber(rq.customer.phone) : '',
          email: rq.customer.email || '',
          vehicle_ymm: '',
          data_source: rq.customer.data_source || 'manual'
        });
        if (rq.customer.license_plate) {
          setLicensePlate(rq.customer.license_plate);
          setLicenseState(rq.customer.license_state || 'CA');
        }
        setCustomerFound(true);
      }

      // Pre-fill tread depths - handle both formats
      // Format 1: { tires: { front_left: {...}, ... } } (from get-quote tread_depth)
      // Format 2: { lf: { inside: 6, ... }, rf: {...}, ... } (from tread_depth_json directly)
      const t = rq.treads?.tires || rq.treads;
      if (t) {
        const lf = t.front_left || t.lf;
        const rf = t.front_right || t.rf;
        const lr = t.rear_left || t.lr;
        const rr = t.rear_right || t.rr;
        setTreadDepths({
          lf: { inside: lf?.inside?.toString() || '', middle: lf?.middle?.toString() || '', outside: lf?.outside?.toString() || '' },
          rf: { inside: rf?.inside?.toString() || '', middle: rf?.middle?.toString() || '', outside: rf?.outside?.toString() || '' },
          lr: { inside: lr?.inside?.toString() || '', middle: lr?.middle?.toString() || '', outside: lr?.outside?.toString() || '' },
          rr: { inside: rr?.inside?.toString() || '', middle: rr?.middle?.toString() || '', outside: rr?.outside?.toString() || '' },
        });
      }

      // Pre-fill replacement reasons if present
      if (rq.tire_replacement_reasons) {
        setReplacementReasons({
          lf: rq.tire_replacement_reasons.lf || [],
          rf: rq.tire_replacement_reasons.rf || [],
          lr: rq.tire_replacement_reasons.lr || [],
          rr: rq.tire_replacement_reasons.rr || [],
        });
      }

      // Set store
      if (rq.store_id) {
        setSelectedStore(rq.store_id.toString());
      }
    } catch (e) {
      console.error('Failed to parse re-quote data:', e);
    }
  }, []);

  // Alt tire search function removed - alt tires now selected in TireFinder

  const handleCustomerLookup = async () => {
    if (!licensePlate.trim()) return;
    setCustomerLookupLoading(true);
    setError(null);
    try {
      const response = await apiCall(`${API_BASE}/customer-lookup?plate=${encodeURIComponent(licensePlate)}&state=${licenseState}&store_id=${encodeURIComponent(selectedStore)}`);
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
        // Don't clear data - user might want to search another way
      }
    } catch (e) { setError('Failed to lookup customer'); }
    finally { setCustomerLookupLoading(false); }
  };

  // Handle selection from advanced search modal
  const handleAdvancedSearchSelect = (customer) => {
    setCustomerFound(true);
    const formattedPhone = customer.phone || '';
    setCustomerData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      full_name: customer.full_name || '',
      phone: formattedPhone,
      email: customer.email || '',
      vehicle_ymm: customer.vehicle_ymm || '',
      data_source: 'lookup'
    });
    // Also populate license plate if available
    if (customer.license_plate) {
      setLicensePlate(customer.license_plate);
      if (customer.license_state) {
        setLicenseState(customer.license_state);
      }
    }
    // Update vehicle if we have it and no vehicle selected
    if (customer.vehicle_ymm && !vehicleData?.display) {
      setVehicleData({ display: customer.vehicle_ymm });
    }
  };

  // Set custom tire data from manual entry form
  const handleSetCustomTire = () => {
    if (!customTire.brand.trim() || !customTire.size.trim() || !customTire.price) {
      setError('Please enter at least Brand, Tire Size, and Price');
      return;
    }
    const price = parseFloat(customTire.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    setError(null);
    setRebateDismissed(false); // Allow rebate auto-detection for new tire
    setTireData({
      part_number: `WC-${Date.now()}`,
      brand: customTire.brand.trim().toUpperCase(),
      brand_code: customTire.brand.trim().toUpperCase(),
      name: customTire.name.trim() || 'Custom Tire',
      sales_class: customTire.name.trim() || 'Custom Tire',
      tire_size: customTire.size.trim().toUpperCase(),
      size: customTire.size.trim().toUpperCase(),
      load_rating: customTire.load_rating.trim() || null,
      speed_rating: customTire.speed_rating.trim().toUpperCase() || null,
      consumer_price: price,
      price: price,
      cost: null,
      fet: customTire.fet ? parseFloat(customTire.fet) : 0,
      warranty: null,
      tire_type: null,
      load_range: null,
      snowflake: false,
      run_flat: false,
      _isCustom: true
    });
  };

  // Check SMS consent status when phone number is entered
  const checkSmsConsent = async (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setSmsOptedOut(null);
      return;
    }
    try {
      const response = await apiCall(`${API_BASE}/sms-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_only: true, phone: digits })
      });
      const data = await response.json();
      if (data.opted_out) {
        setSmsOptedOut({ store_number: data.store_number });
      } else {
        setSmsOptedOut(null);
      }
    } catch (err) {
      setSmsOptedOut(null);
    }
  };

  const handleGenerateQuote = async () => {
    if (!tireData || !selectedEmployee) { setError('Please select a tire and employee'); return; }
    setGenerating(true);
    setError(null);
    const lowestTread = getLowestTread();
    const phoneForStorage = stripPhoneFormatting(customerData.phone);
    
    try {
      const requestBody = {
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
          oe_tire_size: vehicleData.oe_tire_size || null,
          oe_load_rating: vehicleData.oe_load_rating || null,
          oe_speed_rating: vehicleData.oe_speed_rating || null
        } : null,
        tread_depth: lowestTread !== null ? {
          lf: { inside: treadDepths.lf.inside ? parseInt(treadDepths.lf.inside) : null, middle: treadDepths.lf.middle ? parseInt(treadDepths.lf.middle) : null, outside: treadDepths.lf.outside ? parseInt(treadDepths.lf.outside) : null },
          rf: { inside: treadDepths.rf.inside ? parseInt(treadDepths.rf.inside) : null, middle: treadDepths.rf.middle ? parseInt(treadDepths.rf.middle) : null, outside: treadDepths.rf.outside ? parseInt(treadDepths.rf.outside) : null },
          lr: { inside: treadDepths.lr.inside ? parseInt(treadDepths.lr.inside) : null, middle: treadDepths.lr.middle ? parseInt(treadDepths.lr.middle) : null, outside: treadDepths.lr.outside ? parseInt(treadDepths.lr.outside) : null },
          rr: { inside: treadDepths.rr.inside ? parseInt(treadDepths.rr.inside) : null, middle: treadDepths.rr.middle ? parseInt(treadDepths.rr.middle) : null, outside: treadDepths.rr.outside ? parseInt(treadDepths.rr.outside) : null },
          lowest: lowestTread
        } : null,
        tire_replacement_reasons: hasAnyReasons() ? replacementReasons : null,
        tire: {
          part_number: tireData.part_number, 
          brand: tireData.sales_class?.split(' ')[0] || tireData.brand || tireData.brand_code, 
          name: tireData.sales_class || tireData.name,
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
        promo_id: selectedPromo || null,
        rebate_amount: rebateAmount ? parseFloat(rebateAmount) : 0, 
        rebate_description: rebateDescription || null,
        // Staggered fitment
        ...(isStaggered && rearTireData ? {
          is_staggered: true,
          quantity_front: quantityFront,
          quantity_rear: quantityRear,
          tire_rear: {
            part_number: rearTireData.part_number,
            brand: rearTireData.sales_class?.split(' ')[0] || rearTireData.brand || rearTireData.brand_code,
            name: rearTireData.sales_class || rearTireData.name,
            size: rearTireData.tire_size || rearTireData.size,
            type: rearTireData.tire_type,
            warranty_miles: rearTireData.warranty ? parseInt(rearTireData.warranty) : null,
            load_rating: rearTireData.load_rating,
            speed_rating: rearTireData.speed_rating,
            load_range: rearTireData.load_range,
            snowflake: rearTireData.snowflake || false,
            run_flat: rearTireData.run_flat || false,
            price: rearTireData.consumer_price || rearTireData.price,
            cost: rearTireData.cost || null,
            fet: rearTireData.fet ? parseFloat(rearTireData.fet) : 0
          }
        } : {}),
        // Alternative tire options (not used for staggered)
        alt_good: altGoodTire ? {
          part_number: altGoodTire.part_number,
          brand: altGoodTire.sales_class?.split(' ')[0] || altGoodTire.brand || altGoodTire.brand_code,
          name: altGoodTire.sales_class || altGoodTire.name,
          price_per_tire: altGoodTire.consumer_price || altGoodTire.price || altGoodTire.price_per_tire,
          warranty_miles: altGoodTire.warranty ? parseInt(altGoodTire.warranty) : (altGoodTire.warranty_miles || null)
        } : null,
        alt_best: altBestTire ? {
          part_number: altBestTire.part_number,
          brand: altBestTire.sales_class?.split(' ')[0] || altBestTire.brand || altBestTire.brand_code,
          name: altBestTire.sales_class || altBestTire.name,
          price_per_tire: altBestTire.consumer_price || altBestTire.price || altBestTire.price_per_tire,
          warranty_miles: altBestTire.warranty ? parseInt(altBestTire.warranty) : (altBestTire.warranty_miles || null)
        } : null,
        // Revision linkage
        revised_from_quote_id: revisedFromQuoteId || null,
        // Greet linkage (Phase 2)
        from_greet_short_code: greetLink?.short_code || null,
        from_greet_store_id: greetLink?.store_id ?? null
      };
      
      const response = await apiCall(`${API_BASE}/generate-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      if (data.success) {
        sessionStorage.removeItem('jl_quote_tire');
        sessionStorage.removeItem('jl_quote_vehicle');
        sessionStorage.removeItem('jl_quote_qty');
        sessionStorage.removeItem('jl_quote_alt_good');
        sessionStorage.removeItem('jl_quote_alt_best');
        sessionStorage.removeItem('jl_requote_data');
        sessionStorage.removeItem('jl_requote_pending');
        sessionStorage.removeItem('jl_quote_staggered');
        sessionStorage.removeItem('jl_quote_tire_rear');
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
    // Custom mode: show manual tire entry form
    if (isCustomMode) {
      return (
        <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Navbar
            currentPage="builder"
            selectedStore={selectedStore}
            onStoreChange={setSelectedStore}
          />
          <div style={{ maxWidth: '650px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <h2 style={{ color: '#9b59b6', fontSize: '24px', fontWeight: '700', textAlign: 'center', marginBottom: '5px', letterSpacing: '2px' }}>
                CUSTOM QUOTE
              </h2>
              <p style={{ color: '#888', textAlign: 'center', fontSize: '12px', marginBottom: '30px', letterSpacing: '1px' }}>
                ENTER TIRE DETAILS MANUALLY
              </p>

              {/* Brand & Model */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    BRAND *
                  </label>
                  <StyledInput 
                    value={customTire.brand} 
                    onChange={(v) => setCustomTire({...customTire, brand: v})} 
                    placeholder="e.g., MICHELIN" 
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    TIRE MODEL / NAME
                  </label>
                  <StyledInput 
                    value={customTire.name} 
                    onChange={(v) => setCustomTire({...customTire, name: v})} 
                    placeholder="e.g., Defender LTX M/S" 
                  />
                </div>
              </div>

              {/* Size, Load, Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    TIRE SIZE *
                  </label>
                  <StyledInput 
                    value={customTire.size} 
                    onChange={(v) => setCustomTire({...customTire, size: v})} 
                    placeholder="e.g., 245/60R18" 
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    LOAD RATING
                  </label>
                  <StyledInput 
                    value={customTire.load_rating} 
                    onChange={(v) => setCustomTire({...customTire, load_rating: v})} 
                    placeholder="e.g., 99" 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    SPEED RATING
                  </label>
                  <StyledInput 
                    value={customTire.speed_rating} 
                    onChange={(v) => setCustomTire({...customTire, speed_rating: v})} 
                    placeholder="e.g., H" 
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              {/* Price, FET, Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '25px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    PRICE PER TIRE *
                  </label>
                  <StyledInput 
                    type="number"
                    value={customTire.price} 
                    onChange={(v) => setCustomTire({...customTire, price: v})} 
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    FET PER TIRE
                  </label>
                  <StyledInput 
                    type="number"
                    value={customTire.fet} 
                    onChange={(v) => setCustomTire({...customTire, fet: v})} 
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    QUANTITY
                  </label>
                  <SelectDropdown value={quantity} onChange={(v) => setQuantity(parseInt(v))} options={QTY_OPTIONS} placeholder="4" />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ backgroundColor: '#fee', border: '1px solid #e74c3c', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#c0392b', fontSize: '12px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {/* Set Tire Button */}
              <div style={{ textAlign: 'center' }}>
                <button 
                  onClick={handleSetCustomTire} 
                  style={{ 
                    backgroundColor: '#9b59b6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '14px 50px', 
                    borderRadius: '25px', 
                    fontSize: '13px', 
                    fontWeight: '700', 
                    letterSpacing: '2px', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  CONTINUE TO QUOTE →
                </button>
              </div>

              {/* Back Link */}
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <a href="#/" style={{ color: '#999', fontSize: '12px', textDecoration: 'none' }}>
                  ← Back to Tire Finder
                </a>
              </div>

              <p style={{ textAlign: 'center', fontSize: '9px', color: '#bbb', marginTop: '20px' }}>
                * Required fields. Part number will be auto-generated.
              </p>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    // Normal mode: no tire selected
    return (
      <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Navbar
          currentPage="builder"
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
        />
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
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="builder"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />

      {/* Advanced Search Modal */}
      <CustomerSearchModal 
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSelectCustomer={handleAdvancedSearchSelect}
      />

      {/* Revise Loading Overlay */}
      {reviseLoading && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(255,255,255,0.9)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔄</div>
            <div style={{ fontSize: '16px', color: '#9b59b6', fontWeight: '600' }}>Loading quote for re-quote...</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          
          <h2 style={{ color: '#9b59b6', fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '3px' }}>
            {revisedFromQuoteId ? 'RE-QUOTE' : (tireData?._isCustom ? 'CUSTOM QUOTE' : 'CREATE QUOTE')}
          </h2>
          <p style={{ color: '#888', textAlign: 'center', fontSize: '13px', marginBottom: '30px', letterSpacing: '2px' }}>
            {revisedFromQuoteId ? 'NEW QUOTE FROM PREVIOUS — NEW TIRES SELECTED' : (tireData?._isCustom ? 'MANUAL TIRE ENTRY' : 'TIRE QUOTE BUILDER')}
          </p>

          {/* Selected Tire Banner */}
          {isStaggered && rearTireData ? (
            // ===== STAGGERED: Dual tire banners =====
            <div style={{ marginBottom: '30px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <span style={{ 
                  backgroundColor: '#9b59b6', color: 'white', padding: '3px 14px', 
                  borderRadius: '12px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' 
                }}>
                  ⚡ STAGGERED FITMENT — DIFFERENT FRONT / REAR
                </span>
              </div>
              {/* Front Tire */}
              <div style={{ backgroundColor: '#9b59b6', borderRadius: '10px 10px 0 0', padding: '15px 25px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', opacity: 0.8, marginBottom: '3px' }}>▲ FRONT AXLE</div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: '700' }}>{tireData.brand_code || tireData.brand} {tireData.tire_size || tireData.size} {tireData.name || tireData.sales_class}</h3>
                    <p style={{ margin: '0', opacity: 0.8, fontSize: '11px' }}>Part#: {tireData.part_number}{tireData.warranty ? ` • ${parseInt(tireData.warranty).toLocaleString()} mi warranty` : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{formatCurrency(consumerPrice)}</div>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>per tire × {quantityFront}</div>
                  </div>
                </div>
              </div>
              {/* Rear Tire */}
              <div style={{ backgroundColor: '#7b2d8e', borderRadius: '0 0 10px 10px', padding: '15px 25px', color: 'white', borderTop: '2px dashed rgba(255,255,255,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', opacity: 0.8, marginBottom: '3px' }}>▼ REAR AXLE</div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: '700' }}>{rearTireData.brand_code || rearTireData.brand} {rearTireData.tire_size || rearTireData.size} {rearTireData.name || rearTireData.sales_class}</h3>
                    <p style={{ margin: '0', opacity: 0.8, fontSize: '11px' }}>Part#: {rearTireData.part_number}{rearTireData.warranty ? ` • ${parseInt(rearTireData.warranty).toLocaleString()} mi warranty` : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>{formatCurrency(rearTireData.consumer_price || rearTireData.price || 0)}</div>
                    <div style={{ fontSize: '10px', opacity: 0.8 }}>per tire × {quantityRear}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ===== STANDARD: Single tire banner =====
            <div style={{ backgroundColor: '#9b59b6', borderRadius: '10px', padding: '20px 25px', color: 'white', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  {tireData._isCustom && (
                    <span style={{ 
                      backgroundColor: 'rgba(255,255,255,0.25)', 
                      padding: '3px 10px', 
                      borderRadius: '12px', 
                      fontSize: '9px', 
                      fontWeight: '700', 
                      letterSpacing: '1px',
                      marginBottom: '8px',
                      display: 'inline-block'
                    }}>
                      ✏️ CUSTOM ENTRY
                    </span>
                  )}
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
          )}

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

                {/* Advanced Search Link */}
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <button
                    onClick={() => setShowAdvancedSearch(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9b59b6',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '0'
                    }}
                  >
                    🔍 Search by Name or Phone
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
                  <PhoneInput value={customerData.phone} onChange={(v) => { setCustomerData({...customerData, phone: v}); setSmsOptedOut(null); }} onBlur={() => checkSmsConsent(customerData.phone)} placeholder="(805) 555-1234" />
                  <StyledInput value={customerData.email} onChange={(v) => setCustomerData({...customerData, email: v})} placeholder="EMAIL" />
                </div>
                {/* SMS Opted-Out Warning */}
                {smsOptedOut && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '11px', color: '#92400e', textAlign: 'center', fontWeight: '600' }}>
                    ⚠️ Customer previously opted out of SMS. Ask them to text <strong>START</strong> to <strong>{smsOptedOut.store_number || 'the store number'}</strong> to re-subscribe.
                  </div>
                )}
                {/* SMS Consent Notice */}
                <div style={{ marginTop: '8px', fontSize: '9px', color: '#94a3b8', lineHeight: '1.4', textAlign: 'center' }}>
                  📱 By providing a phone number, customer consents to receive tire quote & service messages via SMS. Msg & data rates may apply. Reply STOP to opt out. <a href="#/sms-consent" style={{ color: '#9b59b6', textDecoration: 'underline' }}>SMS Terms</a>
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
                  {isStaggered ? (
                    // Staggered: separate front/rear qty
                    <>
                      <div style={{ width: '90px' }}>
                        <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>▲ FRONT QTY</label>
                        <SelectDropdown value={quantityFront} onChange={(v) => { const f = parseInt(v); setQuantityFront(f); setQuantity(f + quantityRear); }} options={[1, 2, 3]} placeholder="2" />
                      </div>
                      <div style={{ width: '90px' }}>
                        <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>▼ REAR QTY</label>
                        <SelectDropdown value={quantityRear} onChange={(v) => { const r = parseInt(v); setQuantityRear(r); setQuantity(quantityFront + r); }} options={[1, 2, 3]} placeholder="2" />
                      </div>
                      <div style={{ width: '55px' }}>
                        <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>TOTAL</label>
                        <div style={{ padding: '10px 0', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#9b59b6' }}>
                          {quantity}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ width: '70px' }}>
                      <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>QTY</label>
                      <SelectDropdown value={quantity} onChange={(v) => setQuantity(parseInt(v))} options={QTY_OPTIONS} placeholder="4" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '9px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '4px', textAlign: 'center' }}>PROMOTION</label>
                    <SelectDropdown 
                      value={selectedPromo} 
                      onChange={setSelectedPromo} 
                      options={PROMOS.map(p => ({ value: p.id, label: p.name }))} 
                      placeholder="NONE" 
                    />
                  </div>
                  {rebateAmount && !rebateDismissed && (
                    <div style={{
                      flex: '1 1 100%',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '6px'
                    }}>
                      <div>
                        <span style={{ fontSize: '10px', color: '#166534', fontWeight: '700', letterSpacing: '0.5px' }}>
                          🏷️ MANUFACTURER REBATE AUTO-APPLIED
                        </span>
                        <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '600', marginTop: '1px' }}>
                          {rebateDescription} — <strong>${parseFloat(rebateAmount).toFixed(0)} back by mail</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setRebateDismissed(true);
                          setRebateAmount('');
                          setRebateDescription('');
                        }}
                        title="Remove rebate from this quote"
                        style={{
                          background: 'none', border: 'none', color: '#dc2626',
                          cursor: 'pointer', fontSize: '18px', padding: '0 4px', lineHeight: 1
                        }}
                      >×</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Alternative Tire Options (from TireFinder) — hidden for staggered */}
              {!isStaggered && (altGoodTire || altBestTire) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#9b59b6', marginRight: '8px', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: '-3px', width: '7px', height: '7px', backgroundColor: '#9b59b6', borderRadius: '50%' }} />
                    </div>
                    <span style={{ color: '#9b59b6', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>COMPARE OPTIONS</span>
                  </div>

                  {altGoodTire && (
                    <div style={{ 
                      backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', 
                      padding: '8px 12px', marginBottom: '8px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '9px', color: '#16a34a', fontWeight: '700' }}>GOOD </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          {altGoodTire.brand_code || altGoodTire.brand} {altGoodTire.sales_class || altGoodTire.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                          {formatCurrency(altGoodTire.consumer_price || altGoodTire.price || altGoodTire.price_per_tire)}/tire
                        </span>
                      </div>
                      <button onClick={() => setAltGoodTire(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                    </div>
                  )}

                  {altBestTire && (
                    <div style={{ 
                      backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', 
                      padding: '8px 12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: '700' }}>BEST </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#333' }}>
                          {altBestTire.brand_code || altBestTire.brand} {altBestTire.sales_class || altBestTire.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                          {formatCurrency(altBestTire.consumer_price || altBestTire.price || altBestTire.price_per_tire)}/tire
                        </span>
                      </div>
                      <button onClick={() => setAltBestTire(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                    </div>
                  )}
                </div>
              )}
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
                    <TireTreadBlock label="PASS FRONT" values={treadDepths.rf} onChange={(pos, val) => updateTread('rf', pos, val)} reasons={replacementReasons.rf} onReasonsChange={(r) => updateReasons('rf', r)} />
                    <TireTreadBlock label="DRIVER FRONT" values={treadDepths.lf} onChange={(pos, val) => updateTread('lf', pos, val)} reasons={replacementReasons.lf} onReasonsChange={(r) => updateReasons('lf', r)} />
                  </div>

                  {/* Center - Car Image */}
                  <div style={{ padding: '0 15px' }}>
                    <img 
                      src="/images/Vehicle-image.png"
                      alt="Vehicle"
                      style={{ width: '140px', opacity: 0.85 }}
                    />
                  </div>

                  {/* RIGHT SIDE: Rear tires (RR top, LR bottom) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                    <TireTreadBlock label="PASS REAR" values={treadDepths.rr} onChange={(pos, val) => updateTread('rr', pos, val)} reasons={replacementReasons.rr} onReasonsChange={(r) => updateReasons('rr', r)} />
                    <TireTreadBlock label="DRIVER REAR" values={treadDepths.lr} onChange={(pos, val) => updateTread('lr', pos, val)} reasons={replacementReasons.lr} onReasonsChange={(r) => updateReasons('lr', r)} />
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
