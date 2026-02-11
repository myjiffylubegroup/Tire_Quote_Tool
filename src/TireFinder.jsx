import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

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

// Navigation items
const NAV_ITEMS = [
  { label: 'TIRE FINDER', href: '#/', active: true },
  { label: 'STORE INVENTORY', href: '#/inventory', active: false },
  { label: 'RETRIEVE QUOTE', href: '#/quotes', active: false },
  { label: 'ENTERPRISE RENT-A-CAR', href: '#/enterprise', active: false },
  { label: 'FLEET NEGOTIATED', href: '#/fleet', active: false },
];

// Quantity options
const QTY_OPTIONS = [1, 2, 3, 4, 5, 6];

// Fallback static options if API fails
const FALLBACK_WIDTHS = ['155','165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315','325','335'];
const FALLBACK_ASPECTS = ['25','30','35','40','45','50','55','60','65','70','75','80','85'];
const FALLBACK_RIMS = ['13','14','15','16','17','18','19','20','21','22','24'];

// Styled Select Dropdown matching Nexen exactly
const SelectDropdown = ({ value, onChange, options, placeholder, disabled }) => (
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
          color: '#9b59b6',
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
                border: '2px solid #9b59b6',
                borderRadius: '10px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'white',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#9b59b6' }}>
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
                    backgroundColor: '#27ae60',
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
        color: '#9b59b6',
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
          <p style={{ color: '#9b59b6', fontWeight: '600', textAlign: 'center', marginBottom: '15px' }}>
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
          onClick={() => onSearchInventory(spec.tire_size)}
          style={{
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            padding: '14px 40px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
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
    backgroundColor: highlight ? '#f3e8ff' : '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
      {label}
    </div>
    <div style={{ fontSize: highlight ? '18px' : '14px', fontWeight: '700', color: highlight ? '#9b59b6' : '#333' }}>
      {value || '-'}
    </div>
  </div>
);

// Inventory Results Component
const InventoryResults = ({ results, storeId, loading, qtyNeeded, selections, onSelectionChange, onContinueToQuote }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#9b59b6' }}>
        <p style={{ fontSize: '14px' }}>🔍 Searching inventory...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const store = STORES.find(s => s.id === parseInt(storeId));
  const primaryWarehouse = store?.warehouse || 'fresno';
  const hasChosen = !!selections.chosen;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '25px',
      marginTop: '25px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <h3 style={{
        color: '#9b59b6',
        fontSize: '16px',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: '5px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}>
        Available Tires ({results.length})
      </h3>
      <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '8px' }}>
        Primary: {primaryWarehouse === 'fresno' ? 'Fresno (4703)' : 'Santa Clarita (4708)'} • 
        Min Qty: {qtyNeeded} • Sorted: Store Stock → NEXEN → ADVANTA → Price
      </p>
      <p style={{ textAlign: 'center', color: '#9b59b6', fontSize: '11px', marginBottom: '20px', fontStyle: 'italic' }}>
        Select <strong>Chosen</strong> (required), plus optional <strong>Good</strong> & <strong>Best</strong> alternatives
      </p>

      {/* Floating Continue Bar */}
      {hasChosen && (
        <div style={{
          position: 'sticky', top: '0', zIndex: 50,
          backgroundColor: '#8b1538', borderRadius: '10px',
          padding: '12px 20px', marginBottom: '15px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 15px rgba(139, 21, 56, 0.3)',
          flexWrap: 'wrap', gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
              ⭐ {selections.chosen.brand_code} {selections.chosen.sales_class || selections.chosen.name}
            </span>
            {selections.good && (
              <span style={{ color: '#bbf7d0', fontSize: '11px' }}>
                | Good: {selections.good.brand_code} {selections.good.sales_class || selections.good.name}
              </span>
            )}
            {selections.best && (
              <span style={{ color: '#fecaca', fontSize: '11px' }}>
                | Best: {selections.best.brand_code} {selections.best.sales_class || selections.best.name}
              </span>
            )}
          </div>
          <button
            onClick={onContinueToQuote}
            style={{
              backgroundColor: 'white', color: '#8b1538', border: 'none',
              padding: '10px 25px', borderRadius: '20px',
              fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            CONTINUE TO QUOTE →
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((tire, idx) => (
          <TireCard 
            key={tire.part_number + idx} 
            tire={tire} 
            primaryWarehouse={primaryWarehouse} 
            selections={selections}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </div>
  );
};

// Individual Tire Card
const TireCard = ({ tire, primaryWarehouse, selections, onSelectionChange }) => {
  const isPriority = tire.brand_code === 'NEX' || tire.brand_code === 'ADV';
  const primaryQty = primaryWarehouse === 'fresno' ? tire.qty_fresno : tire.qty_santa_clarita;
  const secondaryQty = primaryWarehouse === 'fresno' ? tire.qty_santa_clarita : tire.qty_fresno;
  const hasStoreStock = tire.store_qty > 0;
  
  // Consumer price: cost × 1.5, round up to whole dollar, minus $0.01
  const consumerPrice = tire.cost > 0 ? Math.ceil(parseFloat(tire.cost) * 1.5) - 0.01 : 0;

  // Check which role this tire is assigned
  const isGood = selections.good?.part_number === tire.part_number;
  const isChosen = selections.chosen?.part_number === tire.part_number;
  const isBest = selections.best?.part_number === tire.part_number;
  const isAnySelected = isGood || isChosen || isBest;

  // Handle role toggle
  const handleRoleToggle = (role) => {
    if (consumerPrice <= 0) return;
    const tireWithPrice = { ...tire, consumer_price: consumerPrice };
    
    // If this tire already has this role, uncheck it
    if ((role === 'good' && isGood) || (role === 'chosen' && isChosen) || (role === 'best' && isBest)) {
      onSelectionChange(role, null);
    } else {
      // Clear any other role this tire currently has
      if (isGood) onSelectionChange('good', null);
      if (isChosen) onSelectionChange('chosen', null);
      if (isBest) onSelectionChange('best', null);
      // Assign the new role
      onSelectionChange(role, tireWithPrice);
    }
  };

  // Highlight border if selected
  const selectedBorder = isChosen ? '3px solid #8b1538' : (isGood ? '3px solid #27ae60' : (isBest ? '3px solid #dc2626' : null));

  return (
    <div style={{
      border: selectedBorder || (hasStoreStock ? '2px solid #27ae60' : (isPriority ? '2px solid #9b59b6' : '1px solid #e0e0e0')),
      borderRadius: '10px',
      padding: '15px',
      backgroundColor: isChosen ? '#fdf2f4' : (isGood ? '#f0fdf4' : (isBest ? '#fef2f2' : (hasStoreStock ? '#f0fff4' : (isPriority ? '#faf5ff' : 'white')))),
      position: 'relative',
      transition: 'all 0.2s ease',
    }}>
      {/* Badges */}
      <div style={{ position: 'absolute', top: '-8px', left: '15px', display: 'flex', gap: '5px' }}>
        {hasStoreStock && (
          <span style={{
            backgroundColor: '#27ae60',
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
            backgroundColor: tire.brand_code === 'NEX' ? '#9b59b6' : '#e67e22',
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
        {/* Selection role badge */}
        {isChosen && (
          <span style={{ backgroundColor: '#8b1538', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            ⭐ CHOSEN
          </span>
        )}
        {isGood && (
          <span style={{ backgroundColor: '#27ae60', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            GOOD
          </span>
        )}
        {isBest && (
          <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' }}>
            BEST
          </span>
        )}
      </div>

      {/* Main Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginTop: hasStoreStock || isPriority || isAnySelected ? '5px' : '0' }}>
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
            {tire.ev_compatible && <Badge label="⚡ EV" color="#27ae60" />}
          </div>
        </div>

        {/* Right: Pricing & Inventory */}
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          {consumerPrice > 0 ? (
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#9b59b6' }}>
              ${consumerPrice.toFixed(2)}
            </div>
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
                color: '#27ae60',
                fontWeight: '700',
                marginBottom: '4px',
              }}>
                Store: {tire.store_qty} 🏪
              </div>
            )}
            <div style={{
              color: primaryQty > 0 ? '#27ae60' : '#e74c3c',
              fontWeight: '600',
            }}>
              {primaryWarehouse === 'fresno' ? 'Fresno' : 'Santa Clarita'}: {parseInt(primaryQty) || 0}
              {primaryQty > 0 && ' ✓'}
            </div>
            <div style={{ color: '#888' }}>
              {primaryWarehouse === 'fresno' ? 'Santa Clarita' : 'Fresno'}: {parseInt(secondaryQty) || 0}
            </div>
          </div>

          {/* Role Selection Checkboxes */}
          {consumerPrice > 0 && (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleRoleToggle('good')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isGood ? '2px solid #27ae60' : '2px solid #d1d5db',
                  backgroundColor: isGood ? '#dcfce7' : 'white',
                  color: isGood ? '#16a34a' : '#666',
                }}
              >
                {isGood ? '✓ ' : ''}Good
              </button>
              <button
                onClick={() => handleRoleToggle('chosen')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isChosen ? '2px solid #8b1538' : '2px solid #d1d5db',
                  backgroundColor: isChosen ? '#fde8ed' : 'white',
                  color: isChosen ? '#8b1538' : '#666',
                }}
              >
                {isChosen ? '⭐ ' : ''}Chosen
              </button>
              <button
                onClick={() => handleRoleToggle('best')}
                style={{
                  padding: '5px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                  border: isBest ? '2px solid #dc2626' : '2px solid #d1d5db',
                  backgroundColor: isBest ? '#fef2f2' : 'white',
                  color: isBest ? '#dc2626' : '#666',
                }}
              >
                {isBest ? '✓ ' : ''}Best
              </button>
            </div>
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

export default function TireFinder() {
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
  const [tireSpecs, setTireSpecs] = useState(null); // Now an array of specs
  const [inventoryResults, setInventoryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tire selection state: Good / Chosen / Best
  const [selections, setSelections] = useState({ good: null, chosen: null, best: null });

  const handleSelectionChange = (role, tire) => {
    setSelections(prev => ({ ...prev, [role]: tire }));
  };

  // Reset selections when inventory results change
  useEffect(() => {
    if (!inventoryResults) {
      setSelections({ good: null, chosen: null, best: null });
    }
  }, [inventoryResults]);

  // Handle selecting a specific tire size from multiple options
  const handleSelectTireSize = (spec) => {
    // Set to single-item array so it shows the detail view
    setTireSpecs([spec]);
    // Automatically search inventory for this size
    searchInventory(spec.tire_size);
  };

  // Handle continue to quote - save chosen tire + alternatives to sessionStorage
  const handleContinueToQuote = () => {
    if (!selections.chosen) return;

    // Save chosen tire as the primary (same key as before for backward compatibility)
    sessionStorage.setItem('jl_quote_tire', JSON.stringify(selections.chosen));
    sessionStorage.setItem('jl_quote_qty', qtyNeeded.toString());

    // Save alt tires if selected
    if (selections.good) {
      sessionStorage.setItem('jl_quote_alt_good', JSON.stringify(selections.good));
    } else {
      sessionStorage.removeItem('jl_quote_alt_good');
    }
    if (selections.best) {
      sessionStorage.setItem('jl_quote_alt_best', JSON.stringify(selections.best));
    } else {
      sessionStorage.removeItem('jl_quote_alt_best');
    }
    
    // Save vehicle data if available from YMM search
    if (selectedYear && selectedMake && selectedModel) {
      const selectedSpec = tireSpecs && tireSpecs.length > 0 ? tireSpecs[0] : null;
      
      const vehicleData = {
        year: parseInt(selectedYear),
        make: selectedMake,
        model: selectedModel,
        submodel: selectedSubmodel || null,
        display: `${selectedYear} ${selectedMake} ${selectedModel}${selectedSubmodel ? ' ' + selectedSubmodel : ''}`,
        oe_tire_size: selectedSpec?.tire_size || null,
        oe_load_rating: selectedSpec?.load_index || null,
        oe_speed_rating: selectedSpec?.speed_index || null,
      };
      sessionStorage.setItem('jl_quote_vehicle', JSON.stringify(vehicleData));
    } else {
      sessionStorage.removeItem('jl_quote_vehicle');
    }
    
    // Navigate to quote builder
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
        // Keep using fallback options
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
  const searchInventory = async (tireSize) => {
    setInventoryLoading(true);
    setError(null);
    setInventoryResults(null);
    
    try {
      const compressedSize = tireSize.replace(/[^0-9]/g, '');
      
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_size: compressedSize,
          store_id: parseInt(selectedStore),
          tire_type: selectedTireType || undefined,
          qty_needed: qtyNeeded,
          limit: 100,
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
    // Clear previous results
    setError(null);
    
    // Determine what to search based on what's filled in
    if (selectedYear && selectedMake && selectedModel && selectedSubmodel) {
      // YMM Search
      setLoading(true);
      setTireSpecs(null);
      setInventoryResults(null);
      
      try {
        const res = await fetch(`${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&submodel=${encodeURIComponent(selectedSubmodel)}&key=${API_KEY}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Store ALL tire specs (could be multiple)
          setTireSpecs(data.data);
        } else {
          setError('No tire specs found for this vehicle');
        }
      } catch (e) {
        setError('Failed to load tire specs');
      }
      setLoading(false);
      
    } else if (selectedWidth && selectedAspect && selectedRim) {
      // Tire Size Search
      const tireSize = `${selectedWidth}/${selectedAspect}R${selectedRim}`;
      console.log('Searching for tire size:', tireSize);
      await searchInventory(tireSize);
      
    } else if (partNumber.trim()) {
      // Part Number Search
      await searchByPartNumber();
    }
  };

  const canSearch = 
    (selectedYear && selectedMake && selectedModel && selectedSubmodel) ||
    (selectedWidth && selectedAspect && selectedRim) ||
    partNumber.trim();

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '50px' }}
          />
          {/* Store Selector Only in Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', letterSpacing: '1px' }}>STORE:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
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

      {/* Hero Banner with road/sky background */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
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
            color: '#9b59b6',
            fontSize: '28px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            letterSpacing: '2px',
          }}>
            LET'S GET YOU FITTED!
          </h1>
          <p style={{
            color: '#666',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '35px',
            letterSpacing: '4px',
            fontWeight: '600',
          }}>
            TIRE FINDER
          </p>

          {/* Three Column Layout */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* BY VEHICLE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{
                  color: '#9b59b6',
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
                  backgroundColor: '#9b59b6',
                  marginLeft: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#9b59b6',
                    borderRadius: '50%',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SelectDropdown value={selectedYear} onChange={handleYearChange} options={years} placeholder="YEAR" />
                <SelectDropdown value={selectedMake} onChange={handleMakeChange} options={makes} placeholder="MAKE" disabled={!selectedYear} />
                <SelectDropdown value={selectedModel} onChange={handleModelChange} options={models} placeholder="MODEL" disabled={!selectedMake} />
                <SelectDropdown value={selectedSubmodel} onChange={setSelectedSubmodel} options={submodels.map(s => s.submodel)} placeholder="STYLE" disabled={!selectedModel} />
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

              {/* Car Image - top-down view like Nexen */}
              <img 
                src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/Vehicle-image.png"
                alt="Vehicle"
                style={{ 
                  width: '100%', 
                  maxWidth: '280px',
                  opacity: 0.9,
                }}
              />

              {/* QTY and Part Number - side by side under the car */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginTop: '20px',
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
                      border: '2px solid #9b59b6',
                      borderRadius: '25px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '13px',
                      fontWeight: '600',
                      textAlign: 'center',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
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
                      border: '2px solid #9b59b6',
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
                <p style={{ color: '#9b59b6', marginTop: '10px', fontSize: '13px' }}>Loading...</p>
              )}
            </div>

            {/* BY TIRE SIZE Column */}
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: '#9b59b6',
                  marginRight: '8px',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '-3px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#9b59b6',
                    borderRadius: '50%',
                  }} />
                </div>
                <span style={{
                  color: '#9b59b6',
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
                <p style={{ textAlign: 'center', marginTop: '10px', color: '#9b59b6', fontWeight: '700', fontSize: '14px' }}>
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
                backgroundColor: canSearch ? '#9b59b6' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '14px 50px',
                borderRadius: '25px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '3px',
                cursor: canSearch ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: canSearch ? '0 4px 15px rgba(155, 89, 182, 0.3)' : 'none',
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
            selections={selections}
            onSelectionChange={handleSelectionChange}
            onContinueToQuote={handleContinueToQuote}
          />
        </div>
      </div>

      {/* Footer */}
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
    </div>
  );
}
