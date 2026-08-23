import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import CustomerVehicleLookup, { hasCustomerIdentity } from './CustomerVehicleLookup';

import { API_BASE } from './config';
const API_KEY = 'TIRES2026';

// Enterprise brand colors
const ENTERPRISE_GREEN = '#009750';
const ENTERPRISE_DARK = '#006837';
const ENTERPRISE_BLACK = '#231F20';

// Store list with warehouse assignments and city names
const STORES = [
  { id: 609, name: 'Santa Maria', warehouse: 'fresno' },
  { id: 1002, name: 'San Luis Obispo', warehouse: 'fresno' },
  { id: 1257, name: 'Goleta', warehouse: 'santa_clarita' },
  { id: 1270, name: 'Arroyo Grande', warehouse: 'fresno' },
  { id: 1396, name: 'Santa Barbara (Downtown)', warehouse: 'santa_clarita' },
  { id: 1932, name: 'Atascadero', warehouse: 'fresno' },
  { id: 2911, name: 'Paso Robles', warehouse: 'fresno' },
  { id: 4182, name: 'Santa Barbara (Upper State)', warehouse: 'santa_clarita' },
];

// Quantity options
const QTY_OPTIONS = [1, 2, 4, 5, 6, 8];

// Fallback static options if API fails
const FALLBACK_WIDTHS = ['155','165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315','325','335'];
const FALLBACK_ASPECTS = ['25','30','35','40','45','50','55','60','65','70','75','80','85'];
const FALLBACK_RIMS = ['13','14','15','16','17','18','19','20','21','22','24'];

// Enterprise Pricing Matrix
// Nexen: <100 = cost+5, 100-149 = cost+15, 150-199 = cost+20, 200+ = cost*1.10
// Other brands: Add $15 to each tier
const calculateEnterprisePrice = (cost, brandCode) => {
  if (!cost || cost <= 0) return 0;
  const c = parseFloat(cost);
  const isNexen = brandCode === 'NEX';
  
  if (isNexen) {
    if (c < 100) return c + 20;
    if (c < 150) return c + 25;
    if (c < 200) return c + 30;
    return c * 1.20;
  } else {
    // Other brands: add $15 to each Nexen tier
    if (c < 100) return c + 25;  // 20 + 5
    if (c < 150) return c + 30;  // 15 + 15
    if (c < 200) return c + 35;  // 20 + 15
    return (c * 1.20) + 15;
  }
};

// Styled Select Dropdown - Enterprise Green
const SelectDropdown = ({ value, onChange, options, placeholder, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: `2px solid ${ENTERPRISE_GREEN}`,
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
      backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23009750' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 15px center',
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

// Tire Specs Results Component - handles multiple OE tire sizes
const TireSpecsResults = ({ specs, vehicle, onSearchInventory, onSelectSize }) => {
  if (!specs || specs.length === 0) return null;

  // If multiple tire sizes, show selection
  if (specs.length > 1) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        marginTop: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{
          color: ENTERPRISE_GREEN,
          fontSize: '18px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          Multiple OE Tire Sizes for {vehicle}
        </h3>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginBottom: '20px' }}>
          This vehicle has {specs.length} factory tire size options. Select one:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {specs.map((spec, idx) => (
            <div 
              key={idx}
              onClick={() => onSelectSize(spec)}
              style={{
                border: `2px solid ${ENTERPRISE_GREEN}`,
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'white',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e6f7ef'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: ENTERPRISE_GREEN }}>
                    {spec.tire_size}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    {spec.rim_size} rim • Load {spec.load_index} • Speed {spec.speed_index}
                    {spec.load_range && ` • ${spec.load_range}`}
                  </div>
                  {spec.custom_note && (
                    <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '3px' }}>
                      Note: {spec.custom_note}
                    </div>
                  )}
                </div>
                <button
                  style={{
                    backgroundColor: ENTERPRISE_GREEN,
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  SELECT & SEARCH →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single tire size - show details
  const spec = specs[0];
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '30px',
      marginTop: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{
        color: ENTERPRISE_GREEN,
        fontSize: '18px',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}>
        Tire Specifications for {vehicle}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
      }}>
        <SpecBox label="Tire Size" value={spec.tire_size} highlight />
        <SpecBox label="Rim Size" value={spec.rim_size} />
        <SpecBox label="Bolt Pattern" value={spec.bolt_pattern} />
        <SpecBox label="Load Index" value={spec.load_index} />
        <SpecBox label="Speed Rating" value={spec.speed_index} />
        <SpecBox label="Hub Bore" value={spec.hubbore ? `${spec.hubbore}mm` : '-'} />
      </div>

      {spec.is_staggered && spec.tire_size_rear && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <p style={{ color: ENTERPRISE_GREEN, fontWeight: '600', textAlign: 'center', marginBottom: '15px' }}>
            ⚡ Staggered Fitment (Different Front/Rear)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <SpecBox label="Rear Tire Size" value={spec.tire_size_rear} highlight />
            <SpecBox label="Rear Rim Size" value={spec.rim_size_rear} />
          </div>
        </div>
      )}

      {/* Search Inventory Button */}
      <div style={{ textAlign: 'center', marginTop: '25px' }}>
        <button
          onClick={() => onSearchInventory(spec.tire_size, spec)}
          style={{
            backgroundColor: ENTERPRISE_GREEN,
            color: 'white',
            border: 'none',
            padding: '14px 40px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: `0 4px 15px rgba(0, 151, 80, 0.3)`,
          }}
        >
          🔍 SEARCH INVENTORY FOR {spec.tire_size}
        </button>
      </div>
    </div>
  );
};

const SpecBox = ({ label, value, highlight }) => (
  <div style={{
    backgroundColor: highlight ? '#e6f7ef' : '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
      {label}
    </div>
    <div style={{ fontSize: highlight ? '18px' : '14px', fontWeight: '700', color: highlight ? ENTERPRISE_GREEN : '#333' }}>
      {value || '-'}
    </div>
  </div>
);

// Inventory Results Component
const InventoryResults = ({ results, storeId, loading, qtyNeeded, onQuote }) => {
  const [showCost, setShowCost] = useState(false);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: ENTERPRISE_GREEN }}>
        <p style={{ fontSize: '14px' }}>🔍 Searching inventory...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const store = STORES.find(s => s.id === parseInt(storeId));
  const primaryWarehouse = store?.warehouse || 'fresno';

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '25px',
      marginTop: '25px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{
          color: ENTERPRISE_GREEN,
          fontSize: '16px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          margin: 0,
        }}>
          Available Tires ({results.length})
        </h3>
        <button
          onClick={() => setShowCost(prev => !prev)}
          style={{
            backgroundColor: showCost ? '#f0fff4' : 'white',
            color: showCost ? ENTERPRISE_GREEN : '#888',
            border: `1px solid ${showCost ? ENTERPRISE_GREEN : '#ccc'}`,
            borderRadius: '20px',
            padding: '5px 14px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'all 0.2s ease',
          }}
        >
          {showCost ? '🔒 Hide Cost' : '👁 Show Cost'}
        </button>
      </div>
      <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '20px' }}>
        Primary: {primaryWarehouse === 'fresno' ? 'Fresno (4703)' : 'Santa Clarita (4708)'} • 
        Min Qty: {qtyNeeded} • Sorted: Store Stock → NEXEN → ADVANTA → Price
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((tire, idx) => (
          <TireCard key={tire.part_number + idx} tire={tire} primaryWarehouse={primaryWarehouse} onQuote={onQuote} showCost={showCost} />
        ))}
      </div>
    </div>
  );
};

// Individual Tire Card - Enterprise Pricing
const TireCard = ({ tire, primaryWarehouse, onQuote, showCost }) => {
  const isPriority = tire.brand_code === 'NEX' || tire.brand_code === 'ADV';
  const primaryQty = primaryWarehouse === 'fresno' ? tire.qty_fresno : tire.qty_santa_clarita;
  const secondaryQty = primaryWarehouse === 'fresno' ? tire.qty_santa_clarita : tire.qty_fresno;
  const hasStoreStock = tire.store_qty > 0;
  
  // ENTERPRISE PRICING instead of consumer pricing
  const enterprisePrice = tire.cost > 0 ? calculateEnterprisePrice(tire.cost, tire.brand_code) : 0;

  return (
    <div style={{
      border: hasStoreStock ? `2px solid ${ENTERPRISE_GREEN}` : (isPriority ? `2px solid ${ENTERPRISE_GREEN}` : '1px solid #e0e0e0'),
      borderRadius: '10px',
      padding: '15px',
      backgroundColor: hasStoreStock ? '#f0fff4' : (isPriority ? '#f0fff4' : 'white'),
      position: 'relative',
    }}>
      {/* Badges */}
      <div style={{ position: 'absolute', top: '-8px', left: '15px', display: 'flex', gap: '5px' }}>
        {hasStoreStock && (
          <span style={{
            backgroundColor: ENTERPRISE_GREEN,
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            🏪 IN STORE
          </span>
        )}
        {isPriority && (
          <span style={{
            backgroundColor: tire.brand_code === 'NEX' ? ENTERPRISE_GREEN : '#e67e22',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            {tire.brand_code === 'NEX' ? '⭐ NEXEN' : '💰 ADVANTA'}
          </span>
        )}
        {tire.oe_rating_unverified && (
          <span style={{
            backgroundColor: '#d97706',
            color: 'white',
            padding: '2px 10px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            ⚠️ VERIFY RATINGS
          </span>
        )}
      </div>

      {/* Main Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginTop: hasStoreStock || isPriority ? '5px' : '0' }}>
        {/* Left: Name & Details */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: '700', color: '#333' }}>
            {tire.sales_class || tire.name}
          </h4>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            {tire.name}
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Speed:</strong> {tire.speed_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Load:</strong> {tire.load_rating || '-'}
            </span>
            <span style={{ fontSize: '11px', color: '#888' }}>
              <strong>Range:</strong> {tire.load_range || 'SL'}
            </span>
            {tire.warranty && (
              <span style={{ fontSize: '11px', color: '#888' }}>
                <strong>Warranty:</strong> {parseInt(tire.warranty).toLocaleString()} mi
              </span>
            )}
          </div>
          {/* Feature Badges */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {tire.snowflake && <Badge label="❄️ 3PMSF" color="#3498db" />}
            {tire.run_flat && <Badge label="🛞 Run Flat" color="#e74c3c" />}
            {tire.ev_compatible && <Badge label="⚡ EV" color={ENTERPRISE_GREEN} />}
          </div>
        </div>

        {/* Right: Pricing & Inventory */}
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          {enterprisePrice > 0 ? (
            <>
              <div style={{ fontSize: '10px', color: '#666', fontWeight: '600', marginBottom: '2px' }}>
                ENTERPRISE PRICE
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: ENTERPRISE_GREEN }}>
                ${enterprisePrice.toFixed(2)}
              </div>
              {showCost && tire.cost > 0 && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                  Cost: ${parseFloat(tire.cost).toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
              Call for Price
            </div>
          )}
          {tire.fet > 0 && (
            <div style={{ fontSize: '10px', color: '#888' }}>
              + ${parseFloat(tire.fet).toFixed(2)} FET
            </div>
          )}

          {/* Inventory */}
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            {hasStoreStock && (
              <div style={{
                color: ENTERPRISE_GREEN,
                fontWeight: '700',
                marginBottom: '4px',
              }}>
                Store: {tire.store_qty} 🏪
              </div>
            )}
            <div style={{
              color: primaryQty > 0 ? ENTERPRISE_GREEN : '#e74c3c',
              fontWeight: '600',
            }}>
              {primaryWarehouse === 'fresno' ? 'Fresno' : 'Santa Clarita'}: {parseInt(primaryQty) || 0}
              {primaryQty > 0 && ' ✓'}
            </div>
            <div style={{ color: '#888' }}>
              {primaryWarehouse === 'fresno' ? 'Santa Clarita' : 'Fresno'}: {parseInt(secondaryQty) || 0}
            </div>
          </div>

          {/* QUOTE Button */}
          {enterprisePrice > 0 && onQuote && (
            <button
              onClick={() => onQuote({ ...tire, consumer_price: enterprisePrice, enterprise_price: enterprisePrice })}
              style={{
                marginTop: '12px',
                backgroundColor: ENTERPRISE_GREEN,
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = ENTERPRISE_DARK}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = ENTERPRISE_GREEN}
            >
              📋 QUOTE
            </button>
          )}
        </div>
      </div>

      {/* Part Number & Source */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
        <span>Part #: {tire.part_number}</span>
        <span>{tire.tire_type} | {tire.source === 'store_only' ? 'Store Only' : tire.source === 'both' ? 'Store + Distributor' : 'Distributor'}</span>
      </div>
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{
    backgroundColor: color,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '9px',
    fontWeight: '600',
  }}>
    {label}
  </span>
);

export default function EnterpriseTireFinder() {
  // Store & Qty selection - load from localStorage if available
  const [selectedStore, setSelectedStore] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jl_tire_store') || '609';
    }
    return '609';
  });
  const [qtyNeeded, setQtyNeeded] = useState(4);

  // Save store to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jl_tire_store', selectedStore);
    }
  }, [selectedStore]);

  // Vehicle lookup state
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [submodels, setSubmodels] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSubmodel, setSelectedSubmodel] = useState('');

  // Tire size lookup state - dynamic from inventory
  const [tireTypeOptions, setTireTypeOptions] = useState([]);
  const [widthOptions, setWidthOptions] = useState(FALLBACK_WIDTHS);
  const [aspectOptions, setAspectOptions] = useState(FALLBACK_ASPECTS);
  const [rimOptions, setRimOptions] = useState(FALLBACK_RIMS);
  const [selectedTireType, setSelectedTireType] = useState('');
  const [selectedWidth, setSelectedWidth] = useState('');
  const [selectedAspect, setSelectedAspect] = useState('');
  const [selectedRim, setSelectedRim] = useState('');

  // Part number search
  const [partNumber, setPartNumber] = useState('');

  // Results
  const [tireSpecs, setTireSpecs] = useState(null);
  const [inventoryResults, setInventoryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Customer/vehicle lookup result (plate or VIN). The CustomerVehicleLookup
  // component owns its own input/loading/error state; we just keep the result
  // here so handleQuote can pre-populate customer + vehicle data on
  // click-through to QuoteBuilder.
  const [lookupResult, setLookupResult] = useState(null);

  // ── Lookup callbacks ──
  const handleLookupSuccess = (result, specs) => {
    setLookupResult(result);
    setTireSpecs(specs);
    setInventoryResults(null);
    // Clear YMM selections — user is now in lookup mode
    setSelectedYear('');
    setSelectedMake('');
    setSelectedModel('');
    setSelectedSubmodel('');
  };

  const handleLookupSingleSpec = (spec) => {
    searchInventory(spec.tire_size, spec);
  };

  const handleLookupClear = () => {
    setLookupResult(null);
    setTireSpecs(null);
    setInventoryResults(null);
  };

  // Handle selecting a specific tire size from multiple options
  const handleSelectTireSize = (spec) => {
    setTireSpecs([spec]);
    searchInventory(spec.tire_size, spec);
  };

  // Handle quote button click - save tire data and navigate to quote builder
  const handleQuote = (tire) => {
    sessionStorage.setItem('jl_quote_tire', JSON.stringify(tire));
    sessionStorage.setItem('jl_quote_qty', qtyNeeded.toString());
    sessionStorage.setItem('jl_quote_customer_type', 'enterprise');

    // Vehicle data: prefer lookup result (richer — includes motor_make/model);
    // fall back to YMM dropdowns when no lookup was performed.
    if (lookupResult?.vehicle) {
      const v = lookupResult.vehicle;
      const vehicleData = {
        year: parseInt(v.year),
        make: v.make,
        model: v.model,
        submodel: null,
        display: v.display,
      };
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
    } else if (selectedYear && selectedMake && selectedModel) {
      const vehicleData = {
        year: parseInt(selectedYear),
        make: selectedMake,
        model: selectedModel,
        submodel: (selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? selectedSubmodel : null,
        display: `${selectedYear} ${selectedMake} ${selectedModel}${(selectedSubmodel && selectedSubmodel !== 'UNKNOWN') ? ' ' + selectedSubmodel : ''}`
      };
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
    } else {
      sessionStorage.removeItem('jl_quote_vehicle');
    }

    // Customer data: only if a lookup was performed
    if (hasCustomerIdentity(lookupResult?.customer)) {
      sessionStorage.setItem('jl_quote_customer', JSON.stringify(lookupResult.customer));
    } else {
      sessionStorage.removeItem('jl_quote_customer');
    }

    window.location.hash = '#/quote/build';
  };

  // Fetch years on mount
  useEffect(() => {
    fetch(`${API_BASE}/vehicle-years?key=${API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setYears(data.data);
        else setError('Failed to load years');
      })
      .catch(() => setError('Failed to connect to server'));
  }, []);

  // Fetch tire size options from inventory (with fallback)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedTireType) params.append('tire_type', selectedTireType);
        if (selectedWidth) params.append('width', selectedWidth);
        if (selectedAspect) params.append('aspect', selectedAspect);
        
        const response = await fetch(`${API_BASE}/tire-inventory-options?${params}`);
        const data = await response.json();
        
        if (data.success) {
          if (!selectedTireType && !selectedWidth && !selectedAspect) {
            setTireTypeOptions(data.options.tire_types || []);
          }
          if (data.options.widths?.length > 0) setWidthOptions(data.options.widths.map(String));
          if (data.options.aspects?.length > 0) setAspectOptions(data.options.aspects.map(String));
          if (data.options.rims?.length > 0) setRimOptions(data.options.rims.map(String));
        }
      } catch (e) {
        console.error('Failed to fetch options, using fallbacks:', e);
      }
    };
    
    fetchOptions();
  }, [selectedTireType, selectedWidth, selectedAspect]);

  // Fetch makes when year changes
  useEffect(() => {
    if (!selectedYear) { setMakes([]); return; }
    fetch(`${API_BASE}/vehicle-makes?year=${selectedYear}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setMakes(data.data); })
      .catch(() => {});
  }, [selectedYear]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedYear || !selectedMake) { setModels([]); return; }
    fetch(`${API_BASE}/vehicle-models?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setModels(data.data); })
      .catch(() => {});
  }, [selectedYear, selectedMake]);

  // Fetch submodels when model changes
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) { setSubmodels([]); return; }
    fetch(`${API_BASE}/vehicle-submodels?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&key=${API_KEY}`)
      .then(res => res.json())
      .then(data => { if (data.success) setSubmodels(data.data); })
      .catch(() => {});
  }, [selectedYear, selectedMake, selectedModel]);

  // Handlers
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleMakeChange = (make) => {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    setSelectedSubmodel('');
    setTireSpecs(null);
    setInventoryResults(null);
  };

  const handleTireTypeChange = (type) => {
    setSelectedTireType(type);
    setSelectedWidth('');
    setSelectedAspect('');
    setSelectedRim('');
    setInventoryResults(null);
  };

  const handleWidthChange = (width) => {
    setSelectedWidth(width);
    setSelectedAspect('');
    setSelectedRim('');
    setInventoryResults(null);
  };

  const handleAspectChange = (aspect) => {
    setSelectedAspect(aspect);
    setSelectedRim('');
    setInventoryResults(null);
  };

  // Search inventory by tire size
  const searchInventory = async (tireSize, spec = null) => {
    setInventoryLoading(true);
    setError(null);
    setInventoryResults(null);
    
    try {
      const compressedSize = tireSize.replace(/[^0-9]/g, '');

      const loadIndex = spec?.load_index ? parseInt(spec.load_index, 10) : 0;
      const speedRating = spec?.speed_index || null;
      const hasOeContext = loadIndex > 0 && !!speedRating;
      
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_size: compressedSize,
          store_id: parseInt(selectedStore),
          tire_type: selectedTireType || undefined,
          qty_needed: qtyNeeded,
          limit: 100,
          ...(hasOeContext && {
            min_load_index: loadIndex,
            min_speed_rating: speedRating,
          }),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
        if (data.results.length === 0) {
          setError(`No tires found with ${qtyNeeded}+ in stock for size ${tireSize}`);
        }
      } else {
        setError(data.error || 'Failed to search inventory');
      }
    } catch (e) {
      setError('Failed to search inventory');
    }
    
    setInventoryLoading(false);
  };

  // Search by part number
  const searchByPartNumber = async () => {
    if (!partNumber.trim()) return;
    
    setInventoryLoading(true);
    setError(null);
    setInventoryResults(null);
    setTireSpecs(null);
    
    try {
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_number: partNumber.trim(),
          store_id: parseInt(selectedStore),
          qty_needed: qtyNeeded,
          limit: 50,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
        if (data.results.length === 0) {
          setError('No tires found matching that part number');
        }
      } else {
        setError(data.error || 'Part number not found');
      }
    } catch (e) {
      setError('Failed to search by part number');
    }
    
    setInventoryLoading(false);
  };

  const handleSearch = async () => {
    setError(null);
    
    if (selectedYear && selectedMake && selectedModel && selectedSubmodel) {
      setLoading(true);
      setTireSpecs(null);
      setInventoryResults(null);
      
      try {
        const isUnknownSubmodel = selectedSubmodel === 'UNKNOWN';
        const url = isUnknownSubmodel
          ? `${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&key=${API_KEY}`
          : `${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&submodel=${encodeURIComponent(selectedSubmodel)}&key=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setTireSpecs(data.data);
        } else {
          setError('No tire specs found for this vehicle');
        }
      } catch (e) {
        setError('Failed to load tire specs');
      }
      setLoading(false);
      
    } else if (selectedWidth && selectedAspect && selectedRim) {
      const tireSize = `${selectedWidth}/${selectedAspect}R${selectedRim}`;
      await searchInventory(tireSize);
      
    } else if (partNumber.trim()) {
      await searchByPartNumber();
    }
  };

  const canSearch = 
    (selectedYear && selectedMake && selectedModel && selectedSubmodel) ||
    (selectedWidth && selectedAspect && selectedRim) ||
    partNumber.trim();

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar
        currentPage="enterprise"
        theme="enterprise"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />

      {/* Proprietary Pricing Disclaimer */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        borderBottom: '2px solid #ffc107',
        padding: '12px 20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div style={{ fontSize: '12px', color: '#856404', lineHeight: '1.5' }}>
              <strong>PROPRIETARY PRICING NOTICE:</strong> This pricing is proprietary to <strong>Enterprise Rent-A-Car</strong> based on pre-negotiated prices with the tire manufacturer and distributor exclusive of Jiffy Lube programs. Pricing is <strong>NOT</strong> available to consumers or non-Enterprise Rent-A-Car fleet customers.
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner with road/sky background */}
      <div style={{
        background: `linear-gradient(180deg, ${ENTERPRISE_GREEN}40 0%, #d4e8d4 40%, #e8ebe8 60%, #9ca3af 100%)`,
        padding: '60px 20px',
        position: 'relative',
      }}>
      </div>

      {/* Tire Finder Section - overlapping the hero */}
      <div style={{ maxWidth: '1000px', margin: '-40px auto 40px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
          padding: '40px',
        }}>
          {/* Title */}
          <h1 style={{
            color: ENTERPRISE_GREEN,
            fontSize: '28px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            letterSpacing: '2px',
          }}>
            ENTERPRISE FLEET TIRE FINDER
          </h1>
          <p style={{
            color: '#666',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '35px',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            PRE-NEGOTIATED PRICING
          </p>

          {/* Customer Vehicle Lookup — staff-gated page so the inline
              "Staff? Sign in" hint is suppressed. */}
          <CustomerVehicleLookup
            onLookupSuccess={handleLookupSuccess}
            onClear={handleLookupClear}
            onSingleSpecResolved={handleLookupSingleSpec}
            tireSpecsCount={tireSpecs ? tireSpecs.length : 0}
            hideStaffSigninHint={true}
            storeId={selectedStore}
          />

          {/* Three Column Layout */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* BY VEHICLE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{
                  color: ENTERPRISE_GREEN,
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  BY VEHICLE
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: ENTERPRISE_GREEN,
                  marginLeft: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: ENTERPRISE_GREEN,
                    borderRadius: '50%',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SelectDropdown value={selectedYear} onChange={handleYearChange} options={years} placeholder="YEAR" />
                <SelectDropdown value={selectedMake} onChange={handleMakeChange} options={makes} placeholder="MAKE" disabled={!selectedYear} />
                <SelectDropdown value={selectedModel} onChange={handleModelChange} options={models} placeholder="MODEL" disabled={!selectedMake} />
                <SelectDropdown 
                  value={selectedSubmodel} 
                  onChange={setSelectedSubmodel} 
                  options={[
                    { value: 'UNKNOWN', label: 'UNKNOWN / NOT LISTED' },
                    ...submodels.map(s => ({ value: s.submodel, label: s.submodel }))
                  ]} 
                  placeholder="STYLE" 
                  disabled={!selectedModel} 
                />
              </div>
            </div>

            {/* Center - Car Image + QTY + Part Number */}
            <div style={{ 
              flex: '1.3', 
              minWidth: '220px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
            }}>
              {/* OR divider */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                marginBottom: '15px',
              }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
                <span style={{ 
                  padding: '0 15px', 
                  color: '#999', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  letterSpacing: '2px',
                }}>
                  OR
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
              </div>

              {/* Car Image */}
              <img 
                src="/images/Vehicle-image.png"
                alt="Vehicle"
                style={{ 
                  width: '100%', 
                  maxWidth: '280px',
                  opacity: 0.9,
                }}
              />

              {/* QTY and Part Number - side by side under the car */}
              <div style={{ 
                marginTop: '20px',
                display: 'flex',
                gap: '12px',
                width: '100%',
                maxWidth: '320px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {/* QTY Selector */}
                <div style={{ flex: '1', minWidth: '100px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    QTY NEEDED
                  </label>
                  <select
                    value={qtyNeeded}
                    onChange={(e) => setQtyNeeded(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: `2px solid ${ENTERPRISE_GREEN}`,
                      borderRadius: '25px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23009750' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 15px center',
                    }}
                  >
                    {QTY_OPTIONS.map(qty => (
                      <option key={qty} value={qty}>{qty}</option>
                    ))}
                  </select>
                </div>

                {/* Part Number */}
                <div style={{ flex: '1.5', minWidth: '140px' }}>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    PART NUMBER
                  </label>
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 15007NXK"
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: `2px solid ${ENTERPRISE_GREEN}`,
                      borderRadius: '25px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && partNumber.trim() && searchByPartNumber()}
                  />
                </div>
              </div>

              {loading && (
                <p style={{ color: ENTERPRISE_GREEN, marginTop: '10px', fontSize: '13px' }}>Loading...</p>
              )}
            </div>

            {/* BY TIRE SIZE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: ENTERPRISE_GREEN,
                  marginRight: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: ENTERPRISE_GREEN,
                    borderRadius: '50%',
                  }} />
                </div>
                <span style={{
                  color: ENTERPRISE_GREEN,
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  BY TIRE SIZE
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SelectDropdown 
                  value={selectedTireType} 
                  onChange={handleTireTypeChange} 
                  options={tireTypeOptions.length > 0 ? tireTypeOptions.map(t => ({ value: t, label: t.replace('PASSENGER/CUV/SUV', 'PASSENGER') })) : [
                    { value: 'PASSENGER/CUV/SUV', label: 'PASSENGER' },
                    { value: 'LIGHT TRUCK', label: 'LIGHT TRUCK' },
                    { value: 'TRAILER', label: 'TRAILER' },
                  ]} 
                  placeholder="TIRE TYPE" 
                />
                <SelectDropdown 
                  value={selectedWidth} 
                  onChange={handleWidthChange} 
                  options={widthOptions} 
                  placeholder="WIDTH" 
                />
                <SelectDropdown 
                  value={selectedAspect} 
                  onChange={handleAspectChange} 
                  options={aspectOptions} 
                  placeholder="ASPECT RATIO" 
                  disabled={!selectedWidth}
                />
                <SelectDropdown 
                  value={selectedRim} 
                  onChange={setSelectedRim} 
                  options={rimOptions} 
                  placeholder="RIM SIZE" 
                  disabled={!selectedAspect}
                />
              </div>

              {/* Size Preview */}
              {selectedWidth && selectedAspect && selectedRim && (
                <p style={{ textAlign: 'center', marginTop: '10px', color: ENTERPRISE_GREEN, fontWeight: '700', fontSize: '14px' }}>
                  {selectedWidth}/{selectedAspect}R{selectedRim}
                </p>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button
              onClick={handleSearch}
              disabled={!canSearch}
              style={{
                backgroundColor: canSearch ? ENTERPRISE_GREEN : '#ccc',
                color: 'white',
                border: 'none',
                padding: '14px 50px',
                borderRadius: '25px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '3px',
                cursor: canSearch ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: canSearch ? `0 4px 15px rgba(0, 151, 80, 0.3)` : 'none',
              }}
            >
              SEARCH
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
              {error}
            </p>
          )}

          {/* YMM Results - Tire Specs */}
          {tireSpecs && (
            <TireSpecsResults 
              specs={tireSpecs} 
              vehicle={`${selectedYear} ${selectedMake} ${selectedModel} ${selectedSubmodel}`}
              onSearchInventory={searchInventory}
              onSelectSize={handleSelectTireSize}
            />
          )}

          {/* Inventory Results */}
          <InventoryResults 
            results={inventoryResults} 
            storeId={selectedStore}
            loading={inventoryLoading}
            qtyNeeded={qtyNeeded}
            onQuote={handleQuote}
          />
        </div>
      </div>

      {/* Footer - Enterprise Style */}
      <footer style={{ backgroundColor: ENTERPRISE_BLACK, color: '#95a5a6', padding: '30px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>
            <a href="#/about" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>About Us</a>
            <a href="#/contact" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Contact</a>
            <a href="#/privacy-policy" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px', marginRight: '15px' }}>SMS Terms</a>
            <a href="#/do-not-sell" style={{ color: '#95a5a6', textDecoration: 'none', fontSize: '11px' }}>Do Not Sell My Info</a>
          </div>
          <p style={{ fontSize: '13px', marginBottom: '8px', color: '#ccc' }}>
            Enterprise Rent-A-Car Fleet Tire Program • Pricing exclusive to Enterprise accounts
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
            Powered by P.C.J.L., Inc. • Jiffy Lube MultiCare • tires.myjiffylube.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
