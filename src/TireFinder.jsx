import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

// Store list with warehouse assignments
const STORES = [
  { id: 609, name: 'Store 609 - Long Beach', warehouse: 'fresno' },
  { id: 1002, name: 'Store 1002 - Downey', warehouse: 'fresno' },
  { id: 1257, name: 'Store 1257 - Valencia', warehouse: 'santa_clarita' },
  { id: 1270, name: 'Store 1270 - Lakewood', warehouse: 'fresno' },
  { id: 1396, name: 'Store 1396 - Santa Clarita', warehouse: 'santa_clarita' },
  { id: 1932, name: 'Store 1932 - Bellflower', warehouse: 'fresno' },
  { id: 2911, name: 'Store 2911 - Cerritos', warehouse: 'fresno' },
  { id: 4182, name: 'Store 4182 - Canyon Country', warehouse: 'santa_clarita' },
];

// Tire types for filtering
const TIRE_TYPES = [
  { value: '', label: 'ALL TYPES' },
  { value: 'PASSENGER/CUV/SUV', label: 'PASSENGER' },
  { value: 'LIGHT TRUCK', label: 'LIGHT TRUCK' },
  { value: 'TRAILER', label: 'TRAILER' },
];

// Styled Select Dropdown
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

// Radio Button Component
const RadioButton = ({ name, value, checked, onChange, label }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: checked ? '#9b59b6' : '#666',
    letterSpacing: '0.5px',
  }}>
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={(e) => onChange(e.target.value)}
      style={{ accentColor: '#9b59b6' }}
    />
    {label}
  </label>
);

// Checkbox Component
const Checkbox = ({ checked, onChange, label }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    color: checked ? '#9b59b6' : '#666',
    letterSpacing: '0.5px',
  }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ accentColor: '#9b59b6', width: '14px', height: '14px' }}
    />
    {label}
  </label>
);

// Tire Specs Results Component (for YMM lookup)
const TireSpecsResults = ({ specs, vehicle, onSearchInventory }) => {
  if (!specs) return null;

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
        marginBottom: '15px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}>
        OE Tire Specs: {vehicle}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
      }}>
        <SpecBox label="Tire Size" value={specs.tire_size} highlight />
        <SpecBox label="Rim Size" value={specs.rim_size} />
        <SpecBox label="Bolt Pattern" value={specs.bolt_pattern} />
        <SpecBox label="Load Index" value={specs.load_index} />
        <SpecBox label="Speed Rating" value={specs.speed_index} />
        <SpecBox label="Hub Bore" value={specs.hubbore ? `${specs.hubbore}mm` : '-'} />
      </div>

      {specs.is_staggered && specs.tire_size_rear && (
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#9b59b6', fontWeight: '600', textAlign: 'center', marginBottom: '10px', fontSize: '12px' }}>
            ⚡ Staggered Fitment (Different Front/Rear)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <SpecBox label="Rear Tire Size" value={specs.tire_size_rear} highlight />
            <SpecBox label="Rear Rim Size" value={specs.rim_size_rear} />
          </div>
        </div>
      )}

      {/* Search Inventory Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={() => onSearchInventory(specs.tire_size)}
          style={{
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '25px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
          }}
        >
          🔍 SEARCH INVENTORY FOR {specs.tire_size}
        </button>
      </div>
    </div>
  );
};

const SpecBox = ({ label, value, highlight }) => (
  <div style={{
    backgroundColor: highlight ? '#f3e8ff' : '#f8f8f8',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
      {label}
    </div>
    <div style={{ fontSize: highlight ? '16px' : '13px', fontWeight: '700', color: highlight ? '#9b59b6' : '#333' }}>
      {value || '-'}
    </div>
  </div>
);

// Inventory Results Component
const InventoryResults = ({ results, storeId, loading }) => {
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
      <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginBottom: '20px' }}>
        Primary: {primaryWarehouse === 'fresno' ? 'Fresno (4703)' : 'Santa Clarita (4708)'} • Sorted: NEXEN → ADVANTA → Cost
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((tire, idx) => (
          <TireCard key={tire.part_number + idx} tire={tire} primaryWarehouse={primaryWarehouse} />
        ))}
      </div>
    </div>
  );
};

// Individual Tire Card
const TireCard = ({ tire, primaryWarehouse }) => {
  const isPriority = tire.brand_code === 'NEX' || tire.brand_code === 'ADV';
  const primaryQty = primaryWarehouse === 'fresno' ? tire.qty_fresno : tire.qty_santa_clarita;
  const secondaryQty = primaryWarehouse === 'fresno' ? tire.qty_santa_clarita : tire.qty_fresno;

  return (
    <div style={{
      border: isPriority ? '2px solid #9b59b6' : '1px solid #e0e0e0',
      borderRadius: '10px',
      padding: '15px',
      backgroundColor: isPriority ? '#faf5ff' : 'white',
      position: 'relative',
    }}>
      {/* Priority Badge */}
      {isPriority && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          left: '15px',
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

      {/* Main Info Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
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
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#9b59b6' }}>
            ${parseFloat(tire.cost).toFixed(2)}
          </div>
          {tire.fet > 0 && (
            <div style={{ fontSize: '10px', color: '#888' }}>
              + ${parseFloat(tire.fet).toFixed(2)} FET
            </div>
          )}

          {/* Inventory */}
          <div style={{ marginTop: '10px', fontSize: '11px' }}>
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
            {tire.store_qty !== undefined && (
              <div style={{
                color: tire.store_qty > 0 ? '#2980b9' : '#bdc3c7',
                fontWeight: tire.store_qty > 0 ? '600' : '400',
                marginTop: '4px',
              }}>
                Store On-Hand: {tire.store_qty}
                {tire.store_qty > 0 && ' 🏪'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part Number */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa' }}>
        Part #: {tire.part_number} | Type: {tire.tire_type}
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

// Main Component
export default function TireFinder() {
  // Store selection
  const [selectedStore, setSelectedStore] = useState('609');

  // Search mode
  const [searchMode, setSearchMode] = useState('ymm'); // 'ymm', 'size', 'part'

  // Inventory sources
  const [showUSAutoForce, setShowUSAutoForce] = useState(true);
  const [showStoreInventory, setShowStoreInventory] = useState(true);

  // Vehicle lookup state
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [submodels, setSubmodels] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSubmodel, setSelectedSubmodel] = useState('');

  // Tire size lookup state
  const [selectedTireType, setSelectedTireType] = useState('');
  const [widths] = useState(['145','155','165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315','325','335','345','355']);
  const [ratios] = useState(['25','30','35','40','45','50','55','60','65','70','75','80','85']);
  const [rimSizes] = useState(['13','14','15','16','17','18','19','20','21','22','24','26']);
  const [selectedWidth, setSelectedWidth] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('');
  const [selectedRim, setSelectedRim] = useState('');

  // Part number search
  const [partNumber, setPartNumber] = useState('');

  // Results
  const [tireSpecs, setTireSpecs] = useState(null);
  const [inventoryResults, setInventoryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    setTireSpecs(null);
    setInventoryResults(null);
    setError(null);
  };

  // Search inventory by tire size
  const searchInventory = async (tireSize) => {
    setInventoryLoading(true);
    setError(null);
    
    try {
      // Convert tire size to compressed format if needed (225/55R17 -> 2255517)
      const compressedSize = tireSize.replace(/[^0-9]/g, '');
      
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_size: compressedSize,
          store_id: parseInt(selectedStore),
          tire_type: selectedTireType || undefined,
          limit: 100,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
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
    
    try {
      const response = await fetch(`${API_BASE}/tire-inventory-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_number: partNumber.trim(),
          store_id: parseInt(selectedStore),
          limit: 50,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryResults(data.results);
      } else {
        setError(data.error || 'Part number not found');
      }
    } catch (e) {
      setError('Failed to search by part number');
    }
    
    setInventoryLoading(false);
  };

  const handleSearch = async () => {
    setTireSpecs(null);
    setInventoryResults(null);
    
    if (searchMode === 'ymm') {
      if (!selectedYear || !selectedMake || !selectedModel || !selectedSubmodel) return;
      
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&submodel=${encodeURIComponent(selectedSubmodel)}&key=${API_KEY}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setTireSpecs(data.data[0]);
        } else {
          setError('No tire specs found for this vehicle');
        }
      } catch (e) {
        setError('Failed to load tire specs');
      }
      setLoading(false);
      
    } else if (searchMode === 'size') {
      if (!selectedWidth || !selectedRatio || !selectedRim) return;
      const tireSize = `${selectedWidth}${selectedRatio}${selectedRim}`;
      await searchInventory(tireSize);
      
    } else if (searchMode === 'part') {
      await searchByPartNumber();
    }
  };

  const canSearch = 
    (searchMode === 'ymm' && selectedYear && selectedMake && selectedModel && selectedSubmodel) ||
    (searchMode === 'size' && selectedWidth && selectedRatio && selectedRim) ||
    (searchMode === 'part' && partNumber.trim());

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '45px' }}
          />
          {/* Store Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Purple Nav Bar */}
      <nav style={{ backgroundColor: '#9b59b6', padding: '12px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          {['TIRE FINDER', 'TIRE LINEUP', 'WHY NEXEN', 'WARRANTY'].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px',
                padding: '5px 10px',
                borderBottom: item === 'TIRE FINDER' ? '2px solid white' : '2px solid transparent',
              }}
            >
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
        padding: '50px 20px',
      }} />

      {/* Tire Finder Section */}
      <div style={{ maxWidth: '1000px', margin: '-30px auto 40px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
          padding: '30px',
        }}>
          {/* Title */}
          <h1 style={{
            color: '#9b59b6',
            fontSize: '24px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '5px',
            letterSpacing: '2px',
          }}>
            LET'S GET YOU FITTED!
          </h1>
          <p style={{
            color: '#666',
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '25px',
            letterSpacing: '3px',
            fontWeight: '600',
          }}>
            TIRE FINDER
          </p>

          {/* Search Mode Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '25px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f8f8',
            borderRadius: '25px',
            flexWrap: 'wrap',
          }}>
            <RadioButton name="searchMode" value="ymm" checked={searchMode === 'ymm'} onChange={handleSearchModeChange} label="YEAR / MAKE / MODEL" />
            <RadioButton name="searchMode" value="size" checked={searchMode === 'size'} onChange={handleSearchModeChange} label="TIRE SIZE" />
            <RadioButton name="searchMode" value="part" checked={searchMode === 'part'} onChange={handleSearchModeChange} label="PART NUMBER" />
          </div>

          {/* Inventory Source Checkboxes */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            marginBottom: '25px',
            flexWrap: 'wrap',
          }}>
            <Checkbox checked={showUSAutoForce} onChange={setShowUSAutoForce} label="USAutoForce (Distributor)" />
            <Checkbox checked={showStoreInventory} onChange={setShowStoreInventory} label="Store On-Hand" />
          </div>

          {/* Search Panels */}
          {searchMode === 'ymm' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
                <SelectDropdown value={selectedYear} onChange={handleYearChange} options={years} placeholder="YEAR" />
              </div>
              <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
                <SelectDropdown value={selectedMake} onChange={handleMakeChange} options={makes} placeholder="MAKE" disabled={!selectedYear} />
              </div>
              <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
                <SelectDropdown value={selectedModel} onChange={handleModelChange} options={models} placeholder="MODEL" disabled={!selectedMake} />
              </div>
              <div style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}>
                <SelectDropdown value={selectedSubmodel} onChange={setSelectedSubmodel} options={submodels.map(s => s.submodel)} placeholder="STYLE" disabled={!selectedModel} />
              </div>
            </div>
          )}

          {searchMode === 'size' && (
            <div>
              {/* Tire Type Filter */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {TIRE_TYPES.map(type => (
                  <RadioButton
                    key={type.value}
                    name="tireType"
                    value={type.value}
                    checked={selectedTireType === type.value}
                    onChange={setSelectedTireType}
                    label={type.label}
                  />
                ))}
              </div>

              {/* Size Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ minWidth: '120px' }}>
                  <SelectDropdown value={selectedWidth} onChange={setSelectedWidth} options={widths} placeholder="WIDTH" />
                </div>
                <span style={{ color: '#9b59b6', fontWeight: '700' }}>/</span>
                <div style={{ minWidth: '120px' }}>
                  <SelectDropdown value={selectedRatio} onChange={setSelectedRatio} options={ratios} placeholder="ASPECT" />
                </div>
                <span style={{ color: '#9b59b6', fontWeight: '700' }}>R</span>
                <div style={{ minWidth: '120px' }}>
                  <SelectDropdown value={selectedRim} onChange={setSelectedRim} options={rimSizes} placeholder="RIM" />
                </div>
              </div>

              {/* Preview */}
              {selectedWidth && selectedRatio && selectedRim && (
                <p style={{ textAlign: 'center', marginTop: '15px', color: '#9b59b6', fontWeight: '700', fontSize: '18px' }}>
                  {selectedWidth}/{selectedRatio}R{selectedRim}
                </p>
              )}
            </div>
          )}

          {searchMode === 'part' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                placeholder="Enter Part Number (e.g., 15007NXK)"
                style={{
                  width: '100%',
                  maxWidth: '350px',
                  padding: '12px 20px',
                  border: '2px solid #9b59b6',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center',
                  letterSpacing: '1px',
                  outline: 'none',
                }}
                onKeyPress={(e) => e.key === 'Enter' && canSearch && handleSearch()}
              />
            </div>
          )}

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

          {/* Loading */}
          {loading && (
            <p style={{ color: '#9b59b6', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
              Loading...
            </p>
          )}

          {/* Error Message */}
          {error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
              {error}
            </p>
          )}

          {/* YMM Results - Tire Specs */}
          {searchMode === 'ymm' && tireSpecs && (
            <TireSpecsResults 
              specs={tireSpecs} 
              vehicle={`${selectedYear} ${selectedMake} ${selectedModel} ${selectedSubmodel}`}
              onSearchInventory={searchInventory}
            />
          )}

          {/* Inventory Results */}
          <InventoryResults 
            results={inventoryResults} 
            storeId={selectedStore}
            loading={inventoryLoading}
          />
        </div>
      </div>

      {/* Footer */}
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
    </div>
  );
}
