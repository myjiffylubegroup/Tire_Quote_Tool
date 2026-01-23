import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

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

// Tire Specs Results Component
const TireResults = ({ specs, vehicle }) => {
  if (!specs) return null;

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
        <SpecBox label="Tire Size" value={specs.tire_size} highlight />
        <SpecBox label="Rim Size" value={specs.rim_size} />
        <SpecBox label="Bolt Pattern" value={specs.bolt_pattern} />
        <SpecBox label="Load Index" value={specs.load_index} />
        <SpecBox label="Speed Rating" value={specs.speed_index} />
        <SpecBox label="Hub Bore" value={specs.hubbore ? `${specs.hubbore}mm` : '-'} />
      </div>

      {specs.is_staggered && specs.tire_size_rear && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#9b59b6', fontWeight: '600', textAlign: 'center', marginBottom: '15px' }}>
            ⚡ Staggered Fitment (Different Front/Rear)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <SpecBox label="Rear Tire Size" value={specs.tire_size_rear} highlight />
            <SpecBox label="Rear Rim Size" value={specs.rim_size_rear} />
          </div>
        </div>
      )}
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

export default function TireFinder() {
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
  const [widths] = useState(['165','175','185','195','205','215','225','235','245','255','265','275','285','295','305','315']);
  const [ratios] = useState(['30','35','40','45','50','55','60','65','70','75','80','85']);
  const [rimSizes] = useState(['14','15','16','17','18','19','20','21','22']);
  const [selectedWidth, setSelectedWidth] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('');
  const [selectedRim, setSelectedRim] = useState('');

  // Results
  const [tireSpecs, setTireSpecs] = useState(null);
  const [loading, setLoading] = useState(false);
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
  };

  const handleMakeChange = (make) => {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedSubmodel('');
    setTireSpecs(null);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    setSelectedSubmodel('');
    setTireSpecs(null);
  };

  const handleSearch = async () => {
    if (selectedYear && selectedMake && selectedModel && selectedSubmodel) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/vehicle-tires?year=${selectedYear}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&submodel=${encodeURIComponent(selectedSubmodel)}&key=${API_KEY}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setTireSpecs(data.data[0]);
        }
      } catch (e) {
        setError('Failed to load tire specs');
      }
      setLoading(false);
    } else if (selectedWidth && selectedRatio && selectedRim) {
      alert('Tire size search coming soon - waiting for inventory data');
    }
  };

  const canSearch = (selectedYear && selectedMake && selectedModel && selectedSubmodel) || 
                   (selectedWidth && selectedRatio && selectedRim);

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '50px' }}
          />
        </div>
      </header>

      {/* Purple Nav Bar */}
      <nav style={{ backgroundColor: '#9b59b6', padding: '12px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          {['TIRE FINDER', 'DEALER FINDER', 'TIRE LINEUP', 'WHY NEXEN', 'WARRANTY', 'RESOURCES', 'NEWS', 'REVIEWS'].map((item) => (
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

      {/* Hero Banner with road/sky background */}
      <div style={{
        background: 'linear-gradient(180deg, #a8d4e6 0%, #d4e4e8 40%, #e8ebe8 60%, #9ca3af 100%)',
        padding: '60px 20px',
        position: 'relative',
      }}>
        {/* Trees silhouette effect could go here */}
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

            {/* Center - Car Image + OR */}
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
                <SelectDropdown value={selectedWidth} onChange={setSelectedWidth} options={widths} placeholder="WIDTH" />
                <SelectDropdown value={selectedRatio} onChange={setSelectedRatio} options={ratios} placeholder="TIRE RATIO" />
                <SelectDropdown value={selectedRim} onChange={setSelectedRim} options={rimSizes} placeholder="RIM SIZE" />
                
                {/* Part Number field */}
                <div>
                  <label style={{ fontSize: '10px', color: '#888', fontWeight: '600', letterSpacing: '1px', display: 'block', marginBottom: '4px', textAlign: 'center' }}>
                    PART NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="Coming soon..."
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      border: '2px solid #ddd',
                      borderRadius: '25px',
                      backgroundColor: '#f5f5f5',
                      color: '#999',
                      fontSize: '12px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
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

          {/* Results */}
          <TireResults 
            specs={tireSpecs} 
            vehicle={`${selectedYear} ${selectedMake} ${selectedModel} ${selectedSubmodel}`}
          />
        </div>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: '#2c3e50', color: '#95a5a6', padding: '30px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            © 2026 My Jiffy Lube Group. Tire data provided by MOTOR.
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
            tires.myjiffylube.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
