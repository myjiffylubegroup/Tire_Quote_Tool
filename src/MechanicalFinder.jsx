import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';

const STORES = [
  { id: 609,  name: 'Santa Maria' },
  { id: 1002, name: 'San Luis Obispo' },
  { id: 1257, name: 'Goleta' },
  { id: 1270, name: 'Arroyo Grande' },
  { id: 1396, name: 'Santa Barbara (Downtown)' },
  { id: 1932, name: 'Atascadero' },
  { id: 2911, name: 'Paso Robles' },
  { id: 4182, name: 'Santa Barbara (Upper State)' },
];

const NAV_ITEMS = [
  { label: 'TIRE FINDER',         href: '#/' },
  { label: 'MECHANICAL',          href: '#/mechanical', active: true },
  { label: 'STORE INVENTORY',     href: '#/inventory' },
  { label: 'RETRIEVE QUOTE',      href: '#/quotes' },
  { label: 'ENTERPRISE',          href: '#/enterprise' },
  { label: 'FLEET',               href: '#/fleet' },
];

const PURPLE = '#9b59b6';
const DARK   = '#1e293b';
const LIGHT  = '#f8f4ff';
const BORDER = '#e2d9f3';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const SelectDropdown = ({ value, onChange, options, placeholder, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '10px 15px',
      border: `2px solid ${disabled ? '#ddd' : PURPLE}`,
      borderRadius: '25px',
      backgroundColor: disabled ? '#f5f5f5' : 'white',
      color: disabled ? '#999' : '#333',
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
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
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

const PurpleButton = ({ onClick, disabled, children, small }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      backgroundColor: disabled ? '#ccc' : PURPLE,
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      padding: small ? '8px 20px' : '12px 32px',
      fontSize: small ? '12px' : '14px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      textTransform: 'uppercase',
    }}
  >
    {children}
  </button>
);

const StepLabel = ({ n, label, active, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: active || done ? 1 : 0.4 }}>
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%',
      backgroundColor: done ? '#22c55e' : active ? PURPLE : '#ddd',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: '700', flexShrink: 0,
    }}>
      {done ? '✓' : n}
    </div>
    <span style={{ fontSize: '12px', fontWeight: '600', color: active ? PURPLE : done ? '#22c55e' : '#999', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {label}
    </span>
  </div>
);

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = ({ selectedStore, onStoreChange }) => (
  <>
    <header style={{ backgroundColor: 'white', borderBottom: '1px solid #eee', padding: '15px 0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
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
              border: `2px solid ${PURPLE}`,
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#333',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundColor: 'white',
            }}
          >
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
    <nav style={{ backgroundColor: DARK, padding: '0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '0', overflowX: 'auto' }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              color: item.active ? PURPLE : '#94a3b8',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '1px',
              padding: '14px 16px',
              borderBottom: item.active ? `3px solid ${PURPLE}` : '3px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  </>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MechanicalFinder() {
  // ── Store (persisted) ──
  const [selectedStore, setSelectedStore] = useState(() =>
    localStorage.getItem('jl_tire_store') || '609'
  );
  useEffect(() => {
    localStorage.setItem('jl_tire_store', selectedStore);
  }, [selectedStore]);

  // ── Step tracking ──
  // Steps: 'vehicle' | 'submodel' | 'config' | 'browse' | 'submitted'
  const [step, setStep] = useState('vehicle');

  // ── Step 1: Vehicle picker ──
  const [years,  setYears]  = useState([]);
  const [makes,  setMakes]  = useState([]);
  const [models, setModels] = useState([]);
  const [selYear,  setSelYear]  = useState('');
  const [selMake,  setSelMake]  = useState('');
  const [selModel, setSelModel] = useState('');

  // ── Step 2: Submodel picker ──
  const [submodels,    setSubmodels]    = useState([]);
  const [selSubmodel,  setSelSubmodel]  = useState('');

  // ── Step 3: Config picker ──
  const [configs,    setConfigs]    = useState([]);
  const [selConfig,  setSelConfig]  = useState(null); // full config object

  // ── Step 4: Browse/Search ──
  const [tree,        setTree]        = useState([]);    // [{section, group, subgroup, operation_count}]
  const [selSection,  setSelSection]  = useState('');
  const [selGroup,    setSelGroup]    = useState('');
  const [selSubgroup, setSelSubgroup] = useState('');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [operations,  setOperations]  = useState([]);
  const [cart,        setCart]        = useState([]);    // selected line items

  // ── Customer fields ──
  const [custFirstName,  setCustFirstName]  = useState('');
  const [custLastName,   setCustLastName]   = useState('');
  const [custPhone,      setCustPhone]      = useState('');
  const [custEmail,      setCustEmail]      = useState('');
  const [custPlate,      setCustPlate]      = useState('');
  const [custState,      setCustState]      = useState('CA');
  const [quoteNotes,     setQuoteNotes]     = useState('');

  // ── Loading / error ──
  const [loading,   setLoading]   = useState(false);
  const [opsLoading,setOpsLoading]= useState(false);
  const [error,     setError]     = useState('');

  // ── Generated quote ──
  const [generatedQuote, setGeneratedQuote] = useState(null);

  // ── Auth (from StaffPinGate via localStorage) ──
  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; }
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch years on mount
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/vcdb-vehicle-years?key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setYears(d.data); })
      .catch(() => setError('Failed to load years'));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Cascading vehicle selects
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setSelMake(''); setMakes([]);
    setSelModel(''); setModels([]);
    setSelSubmodel(''); setSubmodels([]);
    setSelConfig(null); setConfigs([]);
    if (!selYear) return;
    fetch(`${API_BASE}/vcdb-vehicle-makes?year=${selYear}&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setMakes(d.data); });
  }, [selYear]);

  useEffect(() => {
    setSelModel(''); setModels([]);
    setSelSubmodel(''); setSubmodels([]);
    setSelConfig(null); setConfigs([]);
    if (!selYear || !selMake) return;
    fetch(`${API_BASE}/vcdb-vehicle-models?year=${selYear}&make=${encodeURIComponent(selMake)}&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setModels(d.data); });
  }, [selMake]);

  useEffect(() => {
    setSelSubmodel(''); setSubmodels([]);
    setSelConfig(null); setConfigs([]);
    if (!selYear || !selMake || !selModel) return;
    setLoading(true);
    fetch(`${API_BASE}/vcdb-vehicle-submodels?year=${selYear}&make=${encodeURIComponent(selMake)}&model=${encodeURIComponent(selModel)}&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setSubmodels(d.data); setStep('submodel'); }
        setLoading(false);
      });
  }, [selModel]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load configs when submodel selected → advance to step 2b
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setSelConfig(null); setConfigs([]);
    if (!selYear || !selMake || !selModel || !selSubmodel) return;
    setLoading(true);
    fetch(`${API_BASE}/vcdb-vehicle-configs?year=${selYear}&make=${encodeURIComponent(selMake)}&model=${encodeURIComponent(selModel)}&submodel=${encodeURIComponent(selSubmodel)}&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setConfigs(d.data);
          setStep('submodel');
        }
        setLoading(false);
      });
  }, [selSubmodel]);

  // ─────────────────────────────────────────────────────────────────────────
  // Load operation tree when config selected
  // ─────────────────────────────────────────────────────────────────────────
  const loadTree = useCallback((baseVehicleId) => {
    fetch(`${API_BASE}/ewt-labor-search?base_vehicle_id=${baseVehicleId}&mode=tree&key=${API_KEY}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTree(d.data); });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load operations when tree node or search changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selConfig) return;
    if (!selSubgroup && !searchTerm) {
      setOperations([]);
      return;
    }
    // Don't search with fewer than 3 chars
    if (searchTerm && searchTerm.trim().length < 3) return;

    setOpsLoading(true);
    const params = new URLSearchParams({ key: API_KEY, base_vehicle_id: selConfig.base_vehicle_id });
    if (searchTerm && searchTerm.trim().length >= 3) {
      params.set('search', searchTerm.trim());
    } else {
      if (selSection)  params.set('section',  selSection);
      if (selGroup)    params.set('group',     selGroup);
      if (selSubgroup) params.set('subgroup',  selSubgroup);
    }
    fetch(`${API_BASE}/ewt-labor-search?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOperations(d.data);
        setOpsLoading(false);
      })
      .catch(() => setOpsLoading(false));
  }, [selSection, selGroup, selSubgroup, searchTerm, selConfig]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectConfig = (cfg) => {
    setSelConfig(cfg);
    setStep('browse');
    setCart([]);
    setTree([]);
    setOperations([]);
    setSelSection(''); setSelGroup(''); setSelSubgroup('');
    setSearchTerm('');
    loadTree(cfg.base_vehicle_id);
  };

  const handleTreeClick = (section, group, subgroup) => {
    setSearchTerm('');
    setSelSection(section);
    setSelGroup(group);
    setSelSubgroup(subgroup);
  };

  const isInCart = (id) => cart.some((c) => c.mechanical_estimating_id === id);

  const toggleCart = (op) => {
    if (isInCart(op.mechanical_estimating_id)) {
      setCart((prev) => prev.filter((c) => c.mechanical_estimating_id !== op.mechanical_estimating_id));
    } else {
      setCart((prev) => [...prev, op]);
    }
  };

  const cartTotal = cart.reduce((sum, op) => sum + Number(op.labor_price), 0);

  const handleGenerateQuote = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const body = {
        key: API_KEY,
        store_id: Number(selectedStore),
        employee: {
          user_id:   auth.user_id  || null,
          user_name: auth.username || 'CSA',
        },
        customer: {
          first_name:    custFirstName  || undefined,
          last_name:     custLastName   || undefined,
          phone:         custPhone      || undefined,
          email:         custEmail      || undefined,
          license_plate: custPlate      || undefined,
          license_state: custState      || undefined,
          data_source:   'manual',
        },
        vehicle: {
          year:            Number(selYear),
          make:            selMake,
          model:           selModel,
          submodel:        selSubmodel,
          display:         `${selYear} ${selMake} ${selModel} ${selSubmodel}`.trim(),
          base_vehicle_id: selConfig.base_vehicle_id,
          config:          selConfig,
        },
        items: cart.map((op) => ({
          mechanical_estimating_id: op.mechanical_estimating_id,
          motor_db_section:         op.motor_db_section,
          motor_db_group:           op.motor_db_group,
          motor_db_subgroup:        op.motor_db_subgroup,
          motor_db_operation:       op.motor_db_operation,
          qualifier_description:    op.qualifier_description,
          motor_time:               op.motor_time,
          is_additional_operation:  op.is_additional_operation,
          motor_db_footnote:        op.motor_db_footnote || '',
          motor_db_description:     op.motor_db_description || '',
        })),
        notes: quoteNotes || undefined,
      };

      const res  = await fetch(`${API_BASE}/generate-mechanical-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedQuote(data.quote);
        setStep('submitted');
      } else {
        setError(data.error || 'Failed to generate quote');
      }
    } catch (e) {
      setError('Network error — please try again');
    }
    setLoading(false);
  };

  const handleReset = () => {
    setStep('vehicle');
    setSelYear(''); setSelMake(''); setSelModel('');
    setSelSubmodel(''); setSelConfig(null);
    setTree([]); setOperations([]); setCart([]);
    setSelSection(''); setSelGroup(''); setSelSubgroup('');
    setSearchTerm('');
    setCustFirstName(''); setCustLastName(''); setCustPhone('');
    setCustEmail(''); setCustPlate(''); setCustState('CA');
    setQuoteNotes('');
    setGeneratedQuote(null);
    setError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived tree structure for nav panel
  // ─────────────────────────────────────────────────────────────────────────
  const treeGrouped = tree.reduce((acc, row) => {
    if (!acc[row.motor_db_section]) acc[row.motor_db_section] = {};
    if (!acc[row.motor_db_section][row.motor_db_group]) acc[row.motor_db_section][row.motor_db_group] = [];
    acc[row.motor_db_section][row.motor_db_group].push(row);
    return acc;
  }, {});

  const [expandedSections, setExpandedSections] = useState({});
  const [expandedGroups,   setExpandedGroups]   = useState({});

  const toggleSection = (s) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const toggleGroup   = (k) => setExpandedGroups((p) => ({ ...p, [k]: !p[k] }));

  // ─────────────────────────────────────────────────────────────────────────
  // Step progress indicators
  // ─────────────────────────────────────────────────────────────────────────
  const stepDone = {
    vehicle:  ['submodel','config','browse','submitted'].includes(step),
    submodel: ['config','browse','submitted'].includes(step),
    config:   ['browse','submitted'].includes(step),
    browse:   step === 'submitted',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <Header selectedStore={selectedStore} onStoreChange={setSelectedStore} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Page title + step progress ── */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: '700', color: DARK }}>
            🔧 Mechanical Labor Quote
          </h1>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <StepLabel n={1} label="Vehicle"  active={step==='vehicle'}  done={stepDone.vehicle} />
            <StepLabel n={2} label="Submodel" active={step==='submodel'} done={stepDone.submodel} />
            <StepLabel n={3} label="Config"   active={step==='submodel'} done={stepDone.config} />
            <StepLabel n={4} label="Services" active={step==='browse'}   done={stepDone.browse} />
            <StepLabel n={5} label="Quote"    active={step==='submitted'} done={false} />
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1: Vehicle Picker
        ══════════════════════════════════════════════════════════════════ */}
        {(step === 'vehicle' || step === 'submodel') && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: DARK, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Step 1 — Select Vehicle
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <SelectDropdown
                value={selYear}
                onChange={setSelYear}
                options={years.map(String)}
                placeholder="Year"
              />
              <SelectDropdown
                value={selMake}
                onChange={setSelMake}
                options={makes}
                placeholder="Make"
                disabled={!selYear}
              />
              <SelectDropdown
                value={selModel}
                onChange={setSelModel}
                options={models}
                placeholder="Model"
                disabled={!selMake}
              />
            </div>
            {loading && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#888' }}>Loading…</div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2a: Submodel Picker
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'submodel' && submodels.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: DARK, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Step 2 — Select Trim / Submodel
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {submodels.map((sm) => (
                <button
                  key={sm}
                  onClick={() => setSelSubmodel(sm)}
                  style={{
                    padding: '12px 16px',
                    border: `2px solid ${selSubmodel === sm ? PURPLE : BORDER}`,
                    borderRadius: '10px',
                    backgroundColor: selSubmodel === sm ? LIGHT : 'white',
                    color: selSubmodel === sm ? PURPLE : DARK,
                    fontSize: '13px',
                    fontWeight: selSubmodel === sm ? '700' : '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {sm}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2b: Config Picker (engine / drive type)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'submodel' && selSubmodel && configs.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: DARK, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Step 3 — Select Engine & Drive Type
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Select the configuration that matches the vehicle in the bay.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {configs.map((cfg, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectConfig(cfg)}
                  style={{
                    padding: '14px 16px',
                    border: `2px solid ${BORDER}`,
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    color: DARK,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: '1.5',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.backgroundColor = LIGHT; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '700', color: PURPLE, marginBottom: '4px' }}>
                    {cfg.engine_liter}L {cfg.engine_cylinders === '4' ? 'L4' : cfg.engine_cylinders === '6' ? 'V6' : cfg.engine_cylinders === '8' ? 'V8' : cfg.engine_cylinders + '-cyl'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {cfg.drive_type_name} · {cfg.front_brake_type}/{cfg.rear_brake_type}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4: Browse + Cart (two-panel layout)
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'browse' && selConfig && (
          <>
            {/* Vehicle summary bar */}
            <div style={{ backgroundColor: DARK, color: 'white', borderRadius: '10px', padding: '12px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>
                  {selYear} {selMake} {selModel} {selSubmodel}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>
                  {selConfig.engine_liter}L · {selConfig.drive_type_name} · {selConfig.front_brake_type}/{selConfig.rear_brake_type}
                </span>
              </div>
              <button
                onClick={handleReset}
                style={{ background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: '20px', padding: '6px 14px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
              >
                ← New Vehicle
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: '16px', alignItems: 'start' }}>

              {/* ── Left: Tree nav ── */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Service Categories
                </div>
                {Object.keys(treeGrouped).sort().map((section) => (
                  <div key={section}>
                    <button
                      onClick={() => toggleSection(section)}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {section}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{expandedSections[section] ? '▼' : '▶'}</span>
                    </button>

                    {expandedSections[section] && Object.keys(treeGrouped[section]).sort().map((group) => (
                      <div key={group} style={{ marginLeft: '10px' }}>
                        <button
                          onClick={() => toggleGroup(`${section}:${group}`)}
                          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '5px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>{group}</span>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>{expandedGroups[`${section}:${group}`] ? '▼' : '▶'}</span>
                        </button>

                        {expandedGroups[`${section}:${group}`] && treeGrouped[section][group].map((row) => (
                          <button
                            key={row.motor_db_subgroup}
                            onClick={() => handleTreeClick(section, group, row.motor_db_subgroup)}
                            style={{
                              width: '100%', textAlign: 'left', background: 'none', border: 'none',
                              padding: '4px 0 4px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              borderLeft: selSubgroup === row.motor_db_subgroup ? `3px solid ${PURPLE}` : '3px solid transparent',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: selSubgroup === row.motor_db_subgroup ? PURPLE : '#64748b', fontWeight: selSubgroup === row.motor_db_subgroup ? '700' : '400' }}>
                              {row.motor_db_subgroup}
                            </span>
                            <span style={{ fontSize: '9px', color: '#94a3b8', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '1px 6px' }}>
                              {row.operation_count}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* ── Center: Operations + Search ── */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Search bar */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search operations (e.g. front pads, oil filter, serpentine)…"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) { setSelSection(''); setSelGroup(''); setSelSubgroup(''); } }}
                    style={{
                      width: '100%', padding: '10px 16px 10px 36px', border: `2px solid ${BORDER}`,
                      borderRadius: '25px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = PURPLE}
                    onBlur={(e) => e.target.style.borderColor = BORDER}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#94a3b8' }}>🔍</span>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>×</button>
                  )}
                </div>

                {/* Breadcrumb */}
                {selSubgroup && !searchTerm && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                    {selSection} › {selGroup} › <strong style={{ color: DARK }}>{selSubgroup}</strong>
                  </div>
                )}

                {opsLoading && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>Loading operations…</div>
                )}

                {!opsLoading && !selSubgroup && !searchTerm && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>👈</div>
                    <div style={{ fontSize: '13px' }}>Select a category from the left, or search above</div>
                  </div>
                )}

                {!opsLoading && searchTerm && searchTerm.trim().length < 3 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Type at least 3 characters to search</div>
                )}

                {!opsLoading && operations.length === 0 && (selSubgroup || (searchTerm && searchTerm.trim().length >= 3)) && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>No operations found</div>
                )}

                {!opsLoading && operations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {operations.map((op) => {
                      const inCart = isInCart(op.mechanical_estimating_id);
                      return (
                        <div
                          key={op.mechanical_estimating_id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '8px', gap: '10px',
                            backgroundColor: inCart ? LIGHT : op.is_additional_operation ? '#fafafa' : 'white',
                            border: `1px solid ${inCart ? PURPLE : op.is_additional_operation ? '#f0e8ff' : BORDER}`,
                            marginLeft: op.is_additional_operation ? '16px' : '0',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              {op.is_additional_operation && (
                                <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#f0e8ff', color: PURPLE, borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>ADD-ON</span>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: DARK }}>
                                {op.motor_db_operation}
                              </span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#f1f5f9', borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>
                                {op.qualifier_description}
                              </span>
                            </div>
                            {searchTerm && (
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                {op.motor_db_section} › {op.motor_db_subgroup}
                              </div>
                            )}
                            {op.motor_db_description && (
                              <div style={{ fontSize: '11px', color: '#475569', fontWeight: '500', marginBottom: '2px' }}>
                                {op.motor_db_description}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {op.motor_time} hrs × $189.99 =&nbsp;
                              <strong style={{ color: DARK }}>{formatCurrency(op.labor_price)}</strong>
                            </div>
                            {op.motor_db_footnote && (
                              <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                                ℹ️ {op.motor_db_footnote}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleCart(op)}
                            style={{
                              flexShrink: 0,
                              padding: '6px 14px',
                              border: `2px solid ${inCart ? PURPLE : BORDER}`,
                              borderRadius: '20px',
                              backgroundColor: inCart ? PURPLE : 'white',
                              color: inCart ? 'white' : '#64748b',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {inCart ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Right: Cart + Customer + Generate ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Cart */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Quote Items
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: PURPLE }}>
                      {cart.length} item{cart.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '12px' }}>
                      No items added yet
                    </div>
                  ) : (
                    <>
                      {cart.map((op) => (
                        <div key={op.mechanical_estimating_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${BORDER}`, gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: DARK, lineHeight: '1.3' }}>
                              {op.motor_db_operation}
                              {op.qualifier_description && <span style={{ color: '#94a3b8', fontWeight: '400' }}> · {op.qualifier_description}</span>}
                            </div>
                            {op.motor_db_description && (
                              <div style={{ fontSize: '10px', color: '#475569' }}>{op.motor_db_description}</div>
                            )}
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{op.motor_time} hrs</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: DARK }}>{formatCurrency(op.labor_price)}</span>
                            <button onClick={() => toggleCart(op)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: '0' }}>×</button>
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: DARK }}>Labor Total</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: PURPLE }}>{formatCurrency(cartTotal)}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        Labor is not taxed · Parts added later
                      </div>
                    </>
                  )}
                </div>

                {/* Customer info */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Customer Info <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </div>
                  {[
                    { label: 'First Name',  value: custFirstName,  setter: setCustFirstName,  type: 'text' },
                    { label: 'Last Name',   value: custLastName,   setter: setCustLastName,   type: 'text' },
                    { label: 'Phone',       value: custPhone,      setter: setCustPhone,      type: 'tel' },
                    { label: 'Email',       value: custEmail,      setter: setCustEmail,      type: 'email' },
                    { label: 'Plate',       value: custPlate,      setter: setCustPlate,      type: 'text' },
                  ].map(({ label, value, setter, type }) => (
                    <div key={label} style={{ marginBottom: '8px' }}>
                      <input
                        type={type}
                        placeholder={label}
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px', border: `1px solid ${BORDER}`,
                          borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
                        }}
                        onFocus={(e) => e.target.style.borderColor = PURPLE}
                        onBlur={(e) => e.target.style.borderColor = BORDER}
                      />
                    </div>
                  ))}
                  <textarea
                    placeholder="Notes (optional)"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = PURPLE}
                    onBlur={(e) => e.target.style.borderColor = BORDER}
                  />
                </div>

                {/* Generate button */}
                <PurpleButton
                  onClick={handleGenerateQuote}
                  disabled={cart.length === 0 || loading}
                >
                  {loading ? 'Generating…' : `Generate Quote · ${formatCurrency(cartTotal)}`}
                </PurpleButton>
              </div>

            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5: Quote Generated
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'submitted' && generatedQuote && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: DARK }}>
              Quote Created
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
              {generatedQuote.vehicle_display}
            </p>

            <div style={{ backgroundColor: LIGHT, borderRadius: '10px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Quote #',  value: generatedQuote.quote_number },
                  { label: 'Store',    value: generatedQuote.store_name },
                  { label: 'Items',    value: `${generatedQuote.item_count} service${generatedQuote.item_count !== 1 ? 's' : ''}` },
                  { label: 'Total',    value: formatCurrency(generatedQuote.total) },
                  { label: 'Expires',  value: new Date(generatedQuote.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Short URL', value: generatedQuote.short_url.replace('https://tires.myjiffylube.ai', '') },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: DARK, wordBreak: 'break-all' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <PurpleButton onClick={() => window.open(generatedQuote.short_url, '_blank')}>
                View Quote
              </PurpleButton>
              <button
                onClick={handleReset}
                style={{ padding: '12px 24px', border: `2px solid ${BORDER}`, borderRadius: '25px', backgroundColor: 'white', color: DARK, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                New Quote
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
