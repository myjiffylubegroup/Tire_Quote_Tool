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

// Navigation items - consistent across all pages
const NAV_ITEMS = [
  { label: 'TIRE FINDER',           href: '#/'          },
  { label: 'STORE INVENTORY',       href: '#/inventory' },
  { label: 'RETRIEVE QUOTE',        href: '#/quotes'    },
  { label: 'ENTERPRISE RENT-A-CAR', href: '#/enterprise'},
  { label: 'FLEET NEGOTIATED',      href: '#/fleet'     },
  { label: 'REPORTS',               href: '#/reports'   },
];

const formatCurrency = (amount) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  return phone;
};

// Header Component - matches TireFinder
const Header = ({ selectedStore, onStoreChange }) => (
  <>
    <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <a href="#/">
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '50px' }}
          />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '1px' }}>STORE:</span>
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            style={{
              padding: '8px 30px 8px 12px',
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
              borderBottom: item.href === '#/quotes' ? '2px solid white' : '2px solid transparent',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  </>
);

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
      fontWeight: '500',
      outline: 'none',
      boxSizing: 'border-box',
      ...style
    }}
    {...props}
  />
);

// Styled Select
const StyledSelect = ({ value, onChange, options, placeholder, style }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: '2px solid #9b59b6',
      borderRadius: '25px',
      backgroundColor: 'white',
      color: '#333',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      outline: 'none',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
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

export default function QuoteLookup() {
  const [selectedStore, setSelectedStore] = useState(() => localStorage.getItem('jl_tire_store') || '609');
  
  // Quote type toggle
  const [quoteMode, setQuoteMode] = useState('tires'); // 'tires' | 'mechanical'

  // Search state
  const [searchType, setSearchType] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const [licenseState, setLicenseState] = useState('CA');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Results state
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Save store to localStorage
  useEffect(() => {
    localStorage.setItem('jl_tire_store', selectedStore);
  }, [selectedStore]);

  // Load recent quotes on mount / when store or mode changes
  useEffect(() => {
    setQuotes([]);
    setHasSearched(false);
    handleSearch(true);
  }, [selectedStore, quoteMode]);

  const handleSearch = async (initialLoad = false) => {
    setLoading(true);
    setError(null);
    if (!initialLoad) setHasSearched(true);

    try {
      const endpoint = quoteMode === 'mechanical' ? 'search-mechanical-quotes' : 'search-quotes';
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: API_KEY,
          store_id: parseInt(selectedStore),
          search_type: searchValue.trim() ? searchType : 'all',
          search_value: searchValue.trim() || undefined,
          license_state: searchType === 'plate' ? licenseState : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          filter_status: quoteMode === 'mechanical' ? undefined : filterStatus,
          limit: 50
        })
      });

      const data = await response.json();

      if (data.success) {
        setQuotes(data.quotes || []);
      } else {
        setError(data.error || 'Failed to search quotes');
      }
    } catch (e) {
      setError('Failed to connect to server');
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    setSearchType('name');
    setFilterStatus('all');
    setHasSearched(false);
    handleSearch(true);
  };

  const openQuote = (shortCode) => {
    if (quoteMode === 'mechanical') {
      window.location.hash = `#/mechanical/${shortCode}`;
    } else {
      window.location.hash = `#/quote/${shortCode}`;
    }
  };

  // Check if quote was created today (Pacific time) — matches get-quote is_editable logic
  const isSameDay = (createdAt) => {
    if (!createdAt) return false;
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const created = new Date(new Date(createdAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return pacific.getFullYear() === created.getFullYear() &&
           pacific.getMonth() === created.getMonth() &&
           pacific.getDate() === created.getDate();
  };

  const editQuote = (shortCode) => {
    window.location.hash = `#/quote/${shortCode}?edit=true`;
  };

  // Re-Quote: fetch full quote data, stash to sessionStorage, navigate to TireFinder
  const [reQuoting, setReQuoting] = useState(null);
  const reQuote = async (quoteId) => {
    setReQuoting(quoteId);
    try {
      const response = await fetch(`${API_BASE}/get-quote?id=${quoteId}&key=${API_KEY}`);
      const data = await response.json();
      if (data.success && data.quote) {
        const q = data.quote;
        const reQuoteData = {
          from_quote_id: q.quote_id,
          from_quote_number: q.quote_number,
          customer: {
            first_name: q.customer.first_name || '',
            last_name: q.customer.last_name || '',
            full_name: q.customer.full_name || '',
            phone: q.customer.phone || '',
            email: q.customer.email || '',
            license_plate: q.customer.license_plate || '',
            license_state: q.customer.license_state || 'CA',
            data_source: q.customer.data_source || 'manual'
          },
          vehicle: q.vehicle || null,
          tire_size: q.tire?.size || null,
          treads: q.tread_depth || null,
          store_id: q.store?.id || null,
          quantity: q.pricing?.quantity || 4
        };
        sessionStorage.setItem('jl_requote_data', JSON.stringify(reQuoteData));
        sessionStorage.setItem('jl_requote_pending', 'true');
        window.location.hash = '#/';
      } else {
        setError('Failed to load quote for re-quoting');
      }
    } catch (e) {
      setError('Failed to connect to server');
    } finally {
      setReQuoting(null);
    }
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* Search Card */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '15px', 
          padding: '30px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '25px'
        }}>
          <h2 style={{ 
            color: '#9b59b6', 
            fontSize: '24px', 
            fontWeight: '700', 
            textAlign: 'center', 
            marginBottom: '5px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Retrieve Quote
          </h2>
          <p style={{ 
            color: '#888', 
            textAlign: 'center', 
            fontSize: '13px', 
            marginBottom: '20px',
            letterSpacing: '1px'
          }}>
            Search saved quotes by customer name, license plate, phone, or quote number
          </p>

          {/* Quote type toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '25px', border: '2px solid #9b59b6', borderRadius: '25px', overflow: 'hidden', width: 'fit-content', margin: '0 auto 25px' }}>
            <button
              onClick={() => setQuoteMode('tires')}
              style={{
                padding: '10px 28px', border: 'none', cursor: 'pointer',
                backgroundColor: quoteMode === 'tires' ? '#9b59b6' : 'white',
                color: quoteMode === 'tires' ? 'white' : '#9b59b6',
                fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
              }}
            >
              🛞 Tire Quotes
            </button>
            <button
              onClick={() => setQuoteMode('mechanical')}
              style={{
                padding: '10px 28px', border: 'none', cursor: 'pointer',
                backgroundColor: quoteMode === 'mechanical' ? '#9b59b6' : 'white',
                color: quoteMode === 'mechanical' ? 'white' : '#9b59b6',
                fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px',
              }}
            >
              🔧 Mechanical Quotes
            </button>
          </div>

          {/* Search Form */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            
            {/* Search Type */}
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                SEARCH BY
              </label>
              <StyledSelect
                value={searchType}
                onChange={setSearchType}
                options={[
                  { value: 'name', label: 'Customer Name' },
                  { value: 'plate', label: 'License Plate' },
                  { value: 'phone', label: 'Phone Number' },
                  { value: 'quote_number', label: 'Quote Number' },
                ]}
                placeholder="Select..."
              />
            </div>

            {/* Search Value */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                {searchType === 'name' ? 'CUSTOMER NAME' : 
                 searchType === 'plate' ? 'LICENSE PLATE' :
                 searchType === 'phone' ? 'PHONE NUMBER' : 'QUOTE NUMBER'}
              </label>
              <StyledInput
                value={searchValue}
                onChange={setSearchValue}
                onKeyPress={handleKeyPress}
                placeholder={
                  searchType === 'name' ? 'e.g., John Smith' :
                  searchType === 'plate' ? 'e.g., 8ABC123' :
                  searchType === 'phone' ? 'e.g., 805-555-1234' :
                  'e.g., JL-609-20260128-001'
                }
              />
            </div>

            {/* License State (only for plate search) */}
            {searchType === 'plate' && (
              <div style={{ width: '100px' }}>
                <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                  STATE
                </label>
                <StyledSelect
                  value={licenseState}
                  onChange={setLicenseState}
                  options={US_STATES}
                  placeholder="State"
                />
              </div>
            )}

            {/* Sort By */}
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                SORT BY
              </label>
              <StyledSelect
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'date', label: 'Date' },
                  { value: 'name', label: 'Name' },
                ]}
                placeholder="Sort..."
              />
            </div>

            {/* Sort Order */}
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                ORDER
              </label>
              <StyledSelect
                value={sortOrder}
                onChange={setSortOrder}
                options={[
                  { value: 'desc', label: 'Newest First' },
                  { value: 'asc', label: 'Oldest First' },
                ]}
                placeholder="Order..."
              />
            </div>

            {/* Conversion Filter — tires only */}
            {quoteMode === 'tires' && (
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', display: 'block', marginBottom: '5px', letterSpacing: '1px' }}>
                FILTER
              </label>
              <StyledSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All Quotes' },
                  { value: 'needs_followup', label: '🔴🟡 Needs Follow-up' },
                  { value: 'purchased', label: '✅ Purchased' },
                  { value: 'not_purchased', label: '— Not Purchased' },
                  { value: 'unmatched', label: '? Unmatched' },
                ]}
                placeholder="Filter..."
              />
            </div>
            )}

            {/* Search Button */}
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '25px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'SEARCHING...' : 'SEARCH'}
            </button>

            {/* Clear Button */}
            {hasSearched && (
              <button
                onClick={handleClear}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '25px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                CLEAR
              </button>
            )}
          </div>

          {error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '15px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Results Header */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px 25px', 
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
              {quotes.length} Quote{quotes.length !== 1 ? 's' : ''} Found
            </span>
            <span style={{ fontSize: '12px', color: '#888' }}>
              Store: {STORES.find(s => s.id === parseInt(selectedStore))?.name || selectedStore}
            </span>
          </div>

          {/* Results Table */}
          {quotes.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Quote #</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Date</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Customer</th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Vehicle</th>
                    {quoteMode === 'tires' ? (
                      <>
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Tread</th>
                        <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Tire</th>
                      </>
                    ) : (
                      <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Services</th>
                    )}
                    <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Total</th>
                    {quoteMode === 'tires' && (
                      <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Purchased</th>
                    )}
                    <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666' }}>Status</th>
                    <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#666', minWidth: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, idx) => (
                    <tr 
                      key={quote.quote_id}
                      style={{ 
                        borderBottom: '1px solid #eee',
                        backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onClick={() => openQuote(quote.short_code)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#fafafa'}
                    >
                      <td style={{ padding: '12px 15px', fontWeight: '600', color: '#9b59b6' }}>
                        {quote.quote_number}
                      </td>
                      <td style={{ padding: '12px 15px', color: '#666' }}>
                        {formatDate(quote.created_at)}
                      </td>
                      <td style={{ padding: '12px 15px' }}>
                        <div style={{ fontWeight: '500', color: '#333' }}>{quote.customer.full_name}</div>
                        {quote.customer.phone && (
                          <div style={{ fontSize: '11px', color: '#888' }}>{formatPhone(quote.customer.phone)}</div>
                        )}
                        {quote.customer.license_plate && (
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {quote.customer.license_plate} ({quote.customer.license_state})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 15px', color: '#666', maxWidth: '200px' }}>
                        <div style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {quote.vehicle_display}
                        </div>
                      </td>
                      {quoteMode === 'tires' && (
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {quote.tread ? (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', flexWrap: 'nowrap' }}>
                            {quote.tread.red_count > 0 && <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🔴 {quote.tread.red_count}</span>}
                            {quote.tread.yellow_count > 0 && <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🟡 {quote.tread.yellow_count}</span>}
                            {quote.tread.green_count > 0 && quote.tread.red_count === 0 && quote.tread.yellow_count === 0 && <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>🟢 {quote.tread.green_count}</span>}
                          </div>
                        ) : <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>}
                      </td>
                      )}
                      {quoteMode === 'tires' ? (
                        <td style={{ padding: '12px 15px', color: '#666' }}>
                          <div style={{ fontWeight: '500' }}>{quote.tire?.brand} {quote.tire?.size}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Qty: {quote.quantity}</div>
                        </td>
                      ) : (
                        <td style={{ padding: '12px 15px', textAlign: 'center', color: '#666' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600' }}>{quote.item_count} labor</div>
                          {quote.parts_count > 0 && <div style={{ fontSize: '11px', color: '#888' }}>{quote.parts_count} parts</div>}
                        </td>
                      )}
                      <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: '600', color: '#333' }}>
                        {formatCurrency(quoteMode === 'mechanical' ? quote.total : quote.total_amount)}
                      </td>
                      {quoteMode === 'tires' && (
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {quote.conversion ? (
                          quote.conversion.status === 'purchased' ? (
                            <span 
                              title={`${quote.conversion.tires_purchased} tire${quote.conversion.tires_purchased !== 1 ? 's' : ''} · Store ${quote.conversion.purchase_store} · ${quote.conversion.days_to_purchase} day${quote.conversion.days_to_purchase !== 1 ? 's' : ''}`}
                              style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', cursor: 'default' }}>
                              ✅ {quote.conversion.tires_purchased}
                            </span>
                          ) : quote.conversion.status === 'unmatched' ? (
                            <span style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>
                              NO PLATE
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                          )
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                        )}
                      </td>
                      )}
                      <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                        {quote.is_expired ? (
                          <span style={{ 
                            backgroundColor: '#fef3c7', 
                            color: '#92400e', 
                            padding: '3px 8px', 
                            borderRadius: '10px', 
                            fontSize: '10px', 
                            fontWeight: '600' 
                          }}>
                            EXPIRED
                          </span>
                        ) : (
                          <span style={{ 
                            backgroundColor: '#d1fae5', 
                            color: '#065f46', 
                            padding: '3px 8px', 
                            borderRadius: '10px', 
                            fontSize: '10px', 
                            fontWeight: '600' 
                          }}>
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openQuote(quote.short_code); }}
                            style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            VIEW
                          </button>
                          {quoteMode === 'tires' && isSameDay(quote.created_at) && !quote.is_expired && (
                            <button
                              onClick={(e) => { e.stopPropagation(); editQuote(quote.short_code); }}
                              style={{ backgroundColor: 'transparent', color: '#9b59b6', border: '1.5px solid #9b59b6', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              EDIT
                            </button>
                          )}
                          {quoteMode === 'tires' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); reQuote(quote.quote_id); }}
                              disabled={reQuoting === quote.quote_id}
                              style={{ backgroundColor: 'transparent', color: '#3b82f6', border: '1.5px solid #3b82f6', padding: '5px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', cursor: reQuoting === quote.quote_id ? 'wait' : 'pointer', opacity: reQuoting === quote.quote_id ? 0.5 : 1 }}
                            >
                              {reQuoting === quote.quote_id ? '...' : 'RE-QUOTE'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888' }}>
              {loading ? (
                <p>Searching...</p>
              ) : hasSearched ? (
                <>
                  <p style={{ fontSize: '16px', marginBottom: '10px' }}>No quotes found</p>
                  <p style={{ fontSize: '13px' }}>Try adjusting your search criteria</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '16px', marginBottom: '10px' }}>Recent quotes will appear here</p>
                  <p style={{ fontSize: '13px' }}>Enter search criteria above to find specific quotes</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
