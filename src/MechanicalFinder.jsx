import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './Navbar';
import { apiCall, apiCallPublic } from './apiClient';

import { API_BASE } from './config';

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

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC',
  'ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const PURPLE = '#9b59b6';
const DARK   = '#1e293b';
const LIGHT  = '#f8f4ff';
const BORDER = '#e2d9f3';
const AMBER  = '#f59e0b';
const GREEN  = '#16a34a';

const formatPhone = (phone) => {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return phone;
};

const isEachOperation = (op) =>
  op.motor_db_description && op.motor_db_description.toLowerCase().includes('each');

const inputStyle = {
  width: '100%', padding: '8px 12px', border: `1px solid ${BORDER}`,
  borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', outline: 'none',
};

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const SelectDropdown = ({ value, onChange, options, placeholder, disabled }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: '100%', padding: '10px 15px',
      border: `2px solid ${disabled ? '#ddd' : PURPLE}`,
      borderRadius: '25px',
      backgroundColor: disabled ? '#f5f5f5' : 'white',
      color: disabled ? '#999' : '#333',
      fontSize: '13px', fontWeight: '600', textTransform: 'uppercase',
      letterSpacing: '0.5px', cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none', appearance: 'none',
      backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 15px center',
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
      color: 'white', border: 'none', borderRadius: '25px',
      padding: small ? '8px 20px' : '12px 32px',
      fontSize: small ? '12px' : '14px', fontWeight: '700',
      letterSpacing: '0.5px', cursor: disabled ? 'not-allowed' : 'pointer',
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

// ─── Each Quantity Modal ───────────────────────────────────────────────────────

const EachModal = ({ op, onConfirm, onCancel }) => {
  const [qty, setQty] = React.useState(1);
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '8px' }}>🔢</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: DARK, textAlign: 'center' }}>Priced Per Unit</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
          <strong>{op.motor_db_operation}</strong> — {op.motor_db_description}
        </p>
        <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
          {formatCurrency(op.labor_price)} each × how many?
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${BORDER}`, background: 'white', fontSize: '20px', cursor: 'pointer', color: DARK }}>−</button>
          <span style={{ fontSize: '28px', fontWeight: '700', color: DARK, minWidth: '40px', textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(qty + 1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${PURPLE}`, background: LIGHT, fontSize: '20px', cursor: 'pointer', color: PURPLE }}>+</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '14px', fontWeight: '700', color: PURPLE }}>
          Total: {formatCurrency(op.labor_price * qty)}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', border: `1px solid ${BORDER}`, borderRadius: '25px', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#64748b', fontWeight: '600' }}>Cancel</button>
          <button onClick={() => onConfirm(qty)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '25px', background: PURPLE, color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}>Add {qty} to Quote</button>
        </div>
      </div>
    </div>
  );
};

// ─── Advanced Search Modal ─────────────────────────────────────────────────────

const AdvancedSearchModal = ({ onSelect, onClose }) => {
  const [searchType, setSearchType] = React.useState('name');
  const [searchValue, setSearchValue] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    setLoading(true); setError(''); setResults([]);
    try {
      let url = `${API_BASE}/customer-lookup`;
      if (searchType === 'name') {
        url += `?search_type=name&last_name=${encodeURIComponent(searchValue.trim())}`;
      } else {
        url += `?search_type=phone&phone=${searchValue.replace(/\D/g,'').trim()}`;
      }
      const res = await apiCall(url);
      const data = await res.json();
      if (data.success && data.customers) setResults(data.customers);
      else if (data.success && data.customer) setResults([data.customer]);
      else setError('No customers found');
    } catch { setError('Search failed'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: DARK }}>Search Customers</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['name','phone'].map((t) => (
            <button key={t} onClick={() => { setSearchType(t); setSearchValue(''); setResults([]); }} style={{
              padding: '6px 16px', borderRadius: '20px', border: `2px solid ${searchType===t ? PURPLE : BORDER}`,
              background: searchType===t ? LIGHT : 'white', color: searchType===t ? PURPLE : '#64748b',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase',
            }}>{t === 'name' ? 'Last Name' : 'Phone'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="text" placeholder={searchType === 'name' ? 'Last name...' : 'Phone number...'}
            value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...inputStyle, flex: 1 }} />
          <PurpleButton onClick={handleSearch} disabled={loading} small>{loading ? '…' : 'Search'}</PurpleButton>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}
        {results.map((c, i) => (
          <button key={i} onClick={() => onSelect(c)} style={{
            width: '100%', textAlign: 'left', padding: '12px', border: `1px solid ${BORDER}`,
            borderRadius: '8px', background: 'white', cursor: 'pointer', marginBottom: '6px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.background = LIGHT; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'white'; }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: DARK }}>{c.full_name || `${c.first_name||''} ${c.last_name||''}`.trim()}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {c.phone && formatPhone(c.phone_raw || c.phone)}
              {c.license_plate && ` · ${c.license_state||''} ${c.license_plate}`}
              {c.vehicle_ymm && ` · ${c.vehicle_ymm}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MechanicalFinder({ revisionMode: revisionModeProp = false }) {
  // ── Store (persisted) ──
  const [selectedStore, setSelectedStore] = useState(() => {
    // Greet handoff: default to the greet's store (changeable, not locked)
    if (typeof window !== 'undefined') {
      try {
        const gh = sessionStorage.getItem('jl_greet_handoff');
        if (gh) {
          const parsed = JSON.parse(gh);
          if (parsed.store_id) return parsed.store_id.toString();
        }
      } catch (e) { /* fall through */ }
    }
    return localStorage.getItem('jl_tire_store') || '609';
  });
  useEffect(() => {
    localStorage.setItem('jl_tire_store', selectedStore);
  }, [selectedStore]);

  // ── Step tracking ──
  // Steps: 'vehicle' | 'submodel' | 'config' | 'browse' | 'parts' | 'submitted'
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
  const [selConfig,  setSelConfig]  = useState(null);

  // ── Step 4: Browse/Search ──
  const [tree,        setTree]        = useState([]);
  const [selSection,  setSelSection]  = useState('');
  const [selGroup,    setSelGroup]    = useState('');
  const [selSubgroup, setSelSubgroup] = useState('');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [operations,  setOperations]  = useState([]);
  const [cart,        setCart]        = useState([]);

  // ── Manual labor form ──
  // CSA-entered misc labor (diagnostic, skid plate removal, shop labor — anything
  // MOTOR's catalog doesn't cover). On "+ Add" it's pushed into cart with
  // is_manual=true and a client_id for React key + stepper/remove targeting
  // (since mechanical_estimating_id is null for manual items).
  const [manualLaborForm, setManualLaborForm] = useState({ description: '', hours: '0.50' });

  // ── Step 5: Parts ──
  const [parts,    setParts]    = useState([]);
  const [partForm, setPartForm] = useState({ part_number: '', description: '', quantity: 1, unit_price: '' });

  // ── Job segmentation (optional CSA-named groupings) ──────────────────────
  // Jobs let the CSA bucket labor + parts into named jobs ("Front Brakes") so
  // the customer quote shows per-job subtotals. Each job carries a client
  // temp_id; labor items (matched by client_id) and parts (matched by index)
  // opt in via a _job_temp_id field carried on the item/part itself. This is
  // sent to generate-mechanical-quote, which resolves temp_ids to real
  // job_ids. No jobs created → fully flat quote, original UX unchanged.
  const [jobs,    setJobs]    = useState([]);   // [{ temp_id, label }]
  const [jobForm, setJobForm] = useState('');
  const [dragJobIndex, setDragJobIndex] = useState(null);  // native drag-to-reorder

  // ── PartsTech punchout state ──
  const [ptSessionId,   setPtSessionId]   = useState(null);   // active punchout session
  const [ptPolling,     setPtPolling]     = useState(false);  // currently polling
  const [ptError,       setPtError]       = useState('');     // punchout error message
  const [ptLoading,     setPtLoading]     = useState(false);  // creating session
  const pollIntervalRef = useRef(null);                       // ref to clear interval

  // ── Revision mode ──
  const [revisionMode,    setRevisionMode]    = useState(false);
  const [revisionContext, setRevisionContext] = useState(null);
  const [revisionAuth,    setRevisionAuth]    = useState('');
  const [revisionError,   setRevisionError]   = useState('');

  // ── Employee list ──
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Each modal ──
  const [eachModalOp, setEachModalOp] = useState(null);

  // ── Customer fields + lookup ──
  const [lookupMode,     setLookupMode]     = useState('plate'); // 'plate' | 'vin'
  const [plateInput,     setPlateInput]     = useState('');
  const [plateState,     setPlateState]     = useState('CA');
  const [vinInput,       setVinInput]       = useState('');
  const [lookupLoading,  setLookupLoading]  = useState(false);
  const [lookupResult,   setLookupResult]   = useState(null);  // 'found' | 'found_vehicle_only' | 'not_found'
  const [showAdvSearch,  setShowAdvSearch]  = useState(false);
  const [pendingMake,    setPendingMake]    = useState('');
  const [pendingModel,   setPendingModel]   = useState('');
  const [custFirstName,  setCustFirstName]  = useState('');
  const [custLastName,   setCustLastName]   = useState('');
  const [custPhone,      setCustPhone]      = useState('');
  const [custEmail,      setCustEmail]      = useState('');
  const [custPlate,      setCustPlate]      = useState('');
  const [custPlateState, setCustPlateState] = useState('CA');
  const [custDataSource, setCustDataSource] = useState('manual');
  const [custVin,        setCustVin]        = useState('');
  // Greet linkage (Phase 2) — set from the greet handoff, sent on generate so
  // the quote links back to the originating greet. Pairs code + store.
  const [greetLink,      setGreetLink]      = useState(null);
  const [quoteNotes,     setQuoteNotes]     = useState('');

  // ── Loading / error ──
  const [loading,    setLoading]    = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [error,      setError]      = useState('');

  // ── Generated quote ──
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [showPlateVinWarning, setShowPlateVinWarning] = useState(false);

  // ── Auth ──
  const auth = (() => {
    try { return JSON.parse(localStorage.getItem('jl_staff_auth') || '{}'); } catch { return {}; }
  })();

  // ── Clean up polling on unmount ──
  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Detect revision mode
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (revisionModeProp) {
      const ctx = sessionStorage.getItem('jl_revision_context');
      if (ctx) {
        try {
          const parsed = JSON.parse(ctx);
          setRevisionContext(parsed);
          setRevisionMode(true);
          sessionStorage.removeItem('jl_revision_context');

          // Parse config_label ("6.2L · GAS · 4WD") into engine_liter and
          // drive_type_name for the vehicle-banner display strip. Only used
          // cosmetically — the authoritative vehicle info is shown via
          // revisionContext.vehicle_display on the right side of the banner.
          const labelParts     = (parsed.config_label || '').split('·').map((s) => s.trim());
          const literMatch     = labelParts[0]?.match(/^([\d.]+)L/);
          const engineLiter    = literMatch ? literMatch[1] : '';
          const driveTypeName  = labelParts[2] || '';

          // Synthesize a minimal selConfig. This is the key missing piece: the
          // browse-step UI checks selConfig truthiness before rendering the
          // tree/operations panels, and the operations-fetch useEffect bails
          // out early if selConfig is null. Without this synth, revision mode
          // shows step 4 highlighted but a blank page below it.
          //
          // We intentionally do NOT populate selYear/selMake/selModel/selSubmodel
          // because the cascading useEffects on those state values reset
          // selConfig back to null. revisionContext.vehicle_display handles the
          // full vehicle label display in the banner.
          setSelConfig({
            base_vehicle_id:  parsed.base_vehicle_id,
            engine_config_id: parsed.engine_config_id ?? null,
            vehicle_id:       parsed.vehicle_id       ?? null,
            engine_liter:     engineLiter,
            drive_type_name:  driveTypeName,
          });

          if (parsed.base_vehicle_id) {
            const params = new URLSearchParams({ base_vehicle_id: parsed.base_vehicle_id, mode: 'tree' });
            if (parsed.engine_config_id) params.set('engine_config_id', String(parsed.engine_config_id));
            if (parsed.vehicle_id)       params.set('vehicle_id',       String(parsed.vehicle_id));
            fetch(`${API_BASE}/ewt-labor-search?${params.toString()}&key=TIRES2026`)
              .then((r) => r.json())
              .then((d) => { if (d.success) setTree(d.data); });
          }
          setStep('browse');
        } catch (e) { console.error('Failed to parse revision context', e); }
      }
    }
  }, [revisionModeProp]);

  // ─────────────────────────────────────────────────────────────────────────
  // Greet handoff (greet → mechanical quote)
  // ─────────────────────────────────────────────────────────────────────────
  // Seeds the plate-entry field and the customer block from a greet. We do NOT
  // reuse the revision-context path: that injects already-resolved VCdb IDs,
  // which a greet doesn't have. Instead we pre-fill the plate the CSA will tap
  // "Look up" on (its own customer-lookup → PartsTech decode resolves the
  // VCdb vehicle), and pre-fill the customer so a new kiosk customer keeps
  // their name even if the decode returns vehicle-only. Consume-on-read.
  useEffect(() => {
    const gh = sessionStorage.getItem('jl_greet_handoff');
    if (!gh) return;
    sessionStorage.removeItem('jl_greet_handoff');
    try {
      const parsed = JSON.parse(gh);
      setLookupMode('plate');
      if (parsed.plate) setPlateInput(parsed.plate.toUpperCase());
      if (parsed.state) setPlateState(parsed.state);
      const c = parsed.customer || {};
      if (c.first_name) setCustFirstName(c.first_name);
      if (c.last_name)  setCustLastName(c.last_name);
      if (c.phone || c.phone_raw) setCustPhone(formatPhone(c.phone_raw || c.phone) || '');
      if (c.email)      setCustEmail(c.email);
      if (parsed.plate) { setCustPlate(parsed.plate.toUpperCase()); setCustPlateState(parsed.state || 'CA'); }
      if (c.vin)        setCustVin(c.vin);
      setCustDataSource('greet');
      // Capture the greet link so generate-mechanical-quote can stamp it.
      if (parsed.greet_short_code) {
        setGreetLink({ short_code: parsed.greet_short_code, store_id: parsed.store_id ?? null });
      }
    } catch (e) {
      console.error('Failed to parse greet handoff:', e);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch years + employees
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/vcdb-vehicle-years?key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setYears(d.data); })
      .catch(() => setError('Failed to load years'));
  }, []);

  useEffect(() => {
    apiCall(`${API_BASE}/employee-list?store_id=${selectedStore}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEmployees(d.employees);
          const me = d.employees.find((e) => e.user_id === auth.user_id);
          if (me) setSelectedEmployee(me);
        }
      });
  }, [selectedStore]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cascading vehicle selects
  // ─────────────────────────────────────────────────────────────────────────
  // Shared mount guard for the cascading YMMS useEffects below. All three
  // fire on initial mount and unconditionally clear selConfig / configs /
  // submodels. That's fine behavior when a user is actively picking a
  // vehicle (each dropdown change should reset downstream state) — but it's
  // destructive during revision-mode init, which runs first and synthesizes
  // selConfig from the stored quote context. The cascades then clobber that
  // work and leave the browse step with no selConfig, rendering blank.
  //
  // This ref starts true. Each of the three cascade effects reads it on its
  // first fire and bails out before touching state. A separate mount-only
  // effect flips it to false afterwards, so normal user-driven cascading
  // behavior resumes unchanged.
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (!selMake) {
      setModels([]); setSelModel('');
      setSubmodels([]); setSelSubmodel('');
      setSelConfig(null); setConfigs([]);
    }
    if (!selYear) { setMakes([]); setSelMake(''); return; }
    fetch(`${API_BASE}/vcdb-vehicle-makes?year=${selYear}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setMakes(d.data); });
  }, [selYear]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (!selModel) {
      setSubmodels([]); setSelSubmodel('');
      setSelConfig(null); setConfigs([]);
    }
    if (!selYear || !selMake) { setModels([]); return; }
    fetch(`${API_BASE}/vcdb-vehicle-models?year=${selYear}&make=${encodeURIComponent(selMake)}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setModels(d.data); });
  }, [selMake, pendingModel]);

  useEffect(() => {
    if (isInitialMount.current) return;
    setSelSubmodel(''); setSubmodels([]);
    setSelConfig(null); setConfigs([]);
    if (!selYear || !selMake || !selModel) return;
    setLoading(true);
    fetch(`${API_BASE}/vcdb-vehicle-submodels?year=${selYear}&make=${encodeURIComponent(selMake)}&model=${encodeURIComponent(selModel)}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setSubmodels(d.data); setStep('submodel'); }
        setLoading(false);
      });
  }, [selModel]);

  useEffect(() => {
    if (isInitialMount.current) return;
    setSelConfig(null); setConfigs([]);
    if (!selYear || !selMake || !selModel || !selSubmodel) return;
    setLoading(true);
    fetch(`${API_BASE}/vcdb-vehicle-configs?year=${selYear}&make=${encodeURIComponent(selMake)}&model=${encodeURIComponent(selModel)}&submodel=${encodeURIComponent(selSubmodel)}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setConfigs(d.data); setStep('submodel'); }
        setLoading(false);
      });
  }, [selSubmodel]);

  // Release the mount guard after the initial render cycle completes. Empty
  // deps + no cleanup means this fires exactly once, right after the first
  // pass of mount-time effects. From here on, cascade effects behave normally.
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load operation tree when config selected
  // ─────────────────────────────────────────────────────────────────────────
  const loadTree = useCallback((baseVehicleId, engineConfigId, vehicleId) => {
    const treeParams = new URLSearchParams({ base_vehicle_id: baseVehicleId, mode: 'tree' });
    if (engineConfigId) treeParams.set('engine_config_id', engineConfigId);
    if (vehicleId)      treeParams.set('vehicle_id',       vehicleId);
    fetch(`${API_BASE}/ewt-labor-search?${treeParams.toString()}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTree(d.data); });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load operations when tree node or search changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selConfig) return;
    if (!selSubgroup && !searchTerm) { setOperations([]); return; }
    if (searchTerm && searchTerm.trim().length < 3) return;
    setOpsLoading(true);
    const params = new URLSearchParams({ base_vehicle_id: selConfig.base_vehicle_id });
    if (selConfig.engine_config_id) params.set('engine_config_id', selConfig.engine_config_id);
    if (selConfig.vehicle_id)       params.set('vehicle_id',       selConfig.vehicle_id);
    if (searchTerm && searchTerm.trim().length >= 3) {
      params.set('search', searchTerm.trim());
    } else {
      if (selSection)  params.set('section',  selSection);
      if (selGroup)    params.set('group',     selGroup);
      if (selSubgroup) params.set('subgroup',  selSubgroup);
    }
    fetch(`${API_BASE}/ewt-labor-search?${params.toString()}&key=TIRES2026`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOperations(d.data); setOpsLoading(false); })
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
    loadTree(cfg.base_vehicle_id, cfg.engine_config_id, cfg.vehicle_id);
  };

  const handleTreeClick = (section, group, subgroup) => {
    setSearchTerm('');
    setSelSection(section);
    setSelGroup(group);
    setSelSubgroup(subgroup);
  };

  const isInCart = (id) => cart.some((c) => c.mechanical_estimating_id === id);
  // Every cart item gets a stable client_id on add. Used for React keys and
  // stepper/remove targeting. Needed because manual items have null
  // mechanical_estimating_id — can't key off that.
  const nextClientId = () => Math.random().toString(36).slice(2, 10);
  const addToCart = (op, qty = 1) => setCart((prev) => [...prev, { ...op, quantity: qty, client_id: nextClientId() }]);
  const handleAddClick = (op) => {
    if (isInCart(op.mechanical_estimating_id)) {
      setCart((prev) => prev.filter((c) => c.mechanical_estimating_id !== op.mechanical_estimating_id));
      return;
    }
    if (isEachOperation(op)) { setEachModalOp(op); } else { addToCart(op, 1); }
  };

  // ── Job segmentation helpers ─────────────────────────────────────────────
  const nextJobTempId = () => 'job_' + Math.random().toString(36).slice(2, 10);
  const addJob = () => {
    const label = jobForm.trim();
    if (!label) return;
    setJobs((prev) => [...prev, { temp_id: nextJobTempId(), label }]);
    setJobForm('');
  };
  const renameJob = (tempId, label) =>
    setJobs((prev) => prev.map((j) => (j.temp_id === tempId ? { ...j, label } : j)));
  const removeJob = (tempId) => {
    setJobs((prev) => prev.filter((j) => j.temp_id !== tempId));
    // Un-bucket any labor/parts that pointed at the removed job.
    setCart((prev) => prev.map((c) => (c._job_temp_id === tempId ? { ...c, _job_temp_id: null } : c)));
    setParts((prev) => prev.map((p) => (p._job_temp_id === tempId ? { ...p, _job_temp_id: null } : p)));
  };
  const assignItemJob = (clientId, tempId) =>
    setCart((prev) => prev.map((c) => (c.client_id === clientId ? { ...c, _job_temp_id: tempId || null } : c)));
  const assignPartJob = (idx, tempId) =>
    setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, _job_temp_id: tempId || null } : p)));

  // Reorder jobs (drag-to-reorder). Job display order on the customer quote is
  // the array order (sent as sort_order at submit time), so moving an element
  // in the array is all that's needed.
  const moveJob = (from, to) => {
    if (from == null || to == null || from === to) return;
    setJobs((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // Compact inline job picker (labor line + part line). Returns null until at
  // least one job exists, so a CSA who never uses jobs sees the original flat
  // UI with no extra controls.
  const renderJobPicker = (value, onChange) => {
    if (jobs.length === 0) return null;
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: '11px', fontWeight: '600', color: value ? PURPLE : '#94a3b8',
          border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '2px 4px',
          backgroundColor: 'white', cursor: 'pointer', maxWidth: '130px',
        }}
      >
        <option value="">General</option>
        {jobs.map((j) => (
          <option key={j.temp_id} value={j.temp_id}>{j.label}</option>
        ))}
      </select>
    );
  };

  // ── Advance from browse (labor) to parts step ──
  const handleGoToParts = () => {
    // Do NOT reset parts here — CSA may be coming back from labor edit
    // and PartsTech parts should persist. Only reset punchout session state.
    setPtSessionId(null);
    setPtPolling(false);
    setPtError('');
    setStep('parts');
  };

  // ── Shared: apply customer + vehicle from any lookup result ──
  const applyLookupResult = async (c, source) => {
    // Customer fields — only fill if we have a real customer record
    if (c.first_name || c.last_name) {
      setCustFirstName(c.first_name || '');
      setCustLastName(c.last_name || '');
    }
    if (c.phone_raw) setCustPhone(formatPhone(c.phone_raw) || '');
    if (c.email)     setCustEmail(c.email);
    if (c.license_plate) {
      setCustPlate(c.license_plate);
      setCustPlateState(c.license_state || 'CA');
    }
    if (c.vin) setCustVin(c.vin);
    setCustDataSource('lookup');

    // Vehicle pre-population
    const vehicleYear     = c.vehicle_year  ? String(c.vehicle_year)  : '';
    const candidateMake   = c.motor_make    || c.vehicle_make  || '';
    const candidateModel  = c.motor_model   || c.vehicle_model || '';

    if (!vehicleYear || !candidateMake) return;

    try {
      const makesRes  = await fetch(`${API_BASE}/vcdb-vehicle-makes?year=${vehicleYear}&key=TIRES2026`);
      const makesData = await makesRes.json();
      if (!makesData.success || !makesData.data) return;

      const makeMatch = makesData.data.find(
        (m) => m.toLowerCase() === candidateMake.toLowerCase()
      ) || makesData.data.find(
        (m) => m.toLowerCase().startsWith(candidateMake.toLowerCase().split(' ')[0])
      );
      if (!makeMatch) return;

      const modelsRes  = await fetch(`${API_BASE}/vcdb-vehicle-models?year=${vehicleYear}&make=${encodeURIComponent(makeMatch)}&key=TIRES2026`);
      const modelsData = await modelsRes.json();
      if (!modelsData.success || !modelsData.data) return;

      const modelMatch = candidateModel ? (
        modelsData.data.find((m) => m.toLowerCase() === candidateModel.toLowerCase()) ||
        modelsData.data.find((m) => m.toLowerCase().startsWith(candidateModel.toLowerCase().split(' ')[0]))
      ) : null;

      if (!modelMatch) {
        setMakes(makesData.data);
        setModels(modelsData.data);
        setSelYear(vehicleYear);
        setSelMake(makeMatch);
        setStep('submodel');
        return;
      }

      const subRes  = await fetch(`${API_BASE}/vcdb-vehicle-submodels?year=${vehicleYear}&make=${encodeURIComponent(makeMatch)}&model=${encodeURIComponent(modelMatch)}&key=TIRES2026`);
      const subData = await subRes.json();

      setMakes(makesData.data);
      setModels(modelsData.data);
      if (subData.success && subData.data) setSubmodels(subData.data);
      setSelYear(vehicleYear);
      setSelMake(makeMatch);
      setSelModel(modelMatch);
      if (subData.success && subData.data && subData.data.length > 0) setStep('submodel');
    } catch (e) {
      console.error('Vehicle pre-population error:', e);
    }
  };

  // ── Plate lookup ──
  const handlePlateLookup = async () => {
    if (!plateInput.trim()) return;

    // store_id is required by customer-lookup for the PartsTech fallback path.
    // selectedStore is always seeded from localStorage with a default, so this
    // guard is defensive — it shouldn't fire in normal use, but if it does we
    // want a clear log line rather than a silent 400 from the Edge Function.
    if (!selectedStore) {
      console.error('Plate lookup attempted without a selected store');
      setLookupResult('not_found');
      return;
    }

    setLookupLoading(true); setLookupResult(null);
    try {
      const res  = await apiCall(`${API_BASE}/customer-lookup?plate=${encodeURIComponent(plateInput.trim())}&state=${plateState}&store_id=${encodeURIComponent(selectedStore)}`);
      const data = await res.json();
      if (data.success && data.found && data.customer) {
        // source='turbo' = customer record in our DB; source='partstech' = vehicle only via external decode
        const hasCustomer = data.source === 'turbo';
        setLookupResult(hasCustomer ? 'found' : 'found_vehicle_only');
        await applyLookupResult(data.customer, data.source || 'plate');
      } else {
        setCustPlate(plateInput.trim());
        setCustPlateState(plateState);
        setLookupResult('not_found');
      }
    } catch (e) {
      console.error('Plate lookup error:', e);
      setLookupResult('not_found');
    }
    setLookupLoading(false);
  };

  // ── VIN lookup ──
  const handleVinLookup = async () => {
    const vin = vinInput.trim().toUpperCase();
    if (vin.length !== 17) return;
    setLookupLoading(true); setLookupResult(null);
    try {
      const res  = await apiCall(`${API_BASE}/customer-lookup?search_type=vin&vin=${encodeURIComponent(vin)}`);
      const data = await res.json();
      if (data.success && data.found && data.customer) {
        // source='turbo' means we have a customer record; source='nhtsa' means vehicle only
        const hasCustomer = data.source === 'turbo';
        setLookupResult(hasCustomer ? 'found' : 'found_vehicle_only');
        setCustVin(vin);
        await applyLookupResult(data.customer, data.source);
      } else {
        // VIN not found in system — still capture it so PartsTech gets vehicle pre-population
        setCustVin(vin);
        setLookupResult('not_found');
      }
    } catch (e) {
      console.error('VIN lookup error:', e);
      setCustVin(vin); // capture even on error
      setLookupResult('not_found');
    }
    setLookupLoading(false);
  };

  const handleAdvSearchSelect = (c) => {
    setCustFirstName(c.first_name || '');
    setCustLastName(c.last_name || '');
    setCustPhone(formatPhone(c.phone_raw || c.phone) || '');
    setCustEmail(c.email || '');
    if (c.license_plate) { setCustPlate(c.license_plate); setCustPlateState(c.license_state || 'CA'); }
    if (c.vin) setCustVin(c.vin);
    setCustDataSource('lookup');
    setLookupResult('found');
    setShowAdvSearch(false);
    const vehicleYear     = c.vehicle_year  ? String(c.vehicle_year)  : '';
    const candidateMakeA  = c.motor_make    || c.vehicle_make  || '';
    const candidateModelA = c.motor_model   || c.vehicle_model || '';
    if (vehicleYear && candidateMakeA) {
      setSelMake(''); setMakes([]);
      setSelModel(''); setModels([]);
      setSelSubmodel(''); setSubmodels([]);
      setSelConfig(null); setConfigs([]);
      setStep('vehicle');
      setSelYear(vehicleYear);
      setPendingMake(candidateMakeA);
      setPendingModel(candidateModelA);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PartsTech Punchout
  // ─────────────────────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPtPolling(false);
  };

  const startPolling = (sessionId) => {
    setPtPolling(true);
    setPtError('');

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiCall(
          `${API_BASE}/partstech-poll-session?session_id=${sessionId}`
        );
        const data = await res.json();

        if (!data.success) {
          // Session expired or not found
          stopPolling();
          setPtError(data.error || 'PartsTech session error — please try again');
          return;
        }

        if (data.ready) {
          stopPolling();
          // Add returned parts to parts array, avoiding duplicates by partstech_order_item_id
          if (data.parts && data.parts.length > 0) {
            setParts((prev) => {
              const existingIds = new Set(prev.map((p) => p.partstech_order_item_id).filter(Boolean));
              const newParts = data.parts.filter(
                (p) => !p.partstech_order_item_id || !existingIds.has(p.partstech_order_item_id)
              );
              return [...prev, ...newParts];
            });
          }
          setPtSessionId(null);
        }
        // if data.ready === false, keep polling
      } catch (err) {
        console.error('Poll error:', err);
        // Don't stop polling on transient network errors — retry next interval
      }
    }, 2000); // poll every 2 seconds
  };

  const handlePunchout = async () => {
    setPtLoading(true);
    setPtError('');

    try {
      const vehiclePayload = {
        year:       selYear     ? Number(selYear) : undefined,
        make:       selMake     || undefined,
        model:      selModel    || undefined,
        submodel:   selSubmodel || undefined,
        vin:        custVin     || undefined,
        plate:      custPlate   || undefined,
        plateState: custPlate   ? custPlateState : undefined,
      };

      const res = await apiCall(`${API_BASE}/partstech-punchout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id:  Number(selectedStore),
          vehicle:   vehiclePayload,
          // PO number: VIN preferred, plate fallback — helps CSA match delivered parts
          po_number: custVin || custPlate || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setPtError(data.error || 'Failed to open PartsTech — please try again');
        setPtLoading(false);
        return;
      }

      // Open PartsTech in new tab
      const ptTab = window.open(data.redirect_url, '_blank');

      // PartsTech's us-communication.js sends postMessages to the opener window
      // during normal operation. Without a listener here, their script throws
      // "[object Object] is not valid JSON" and aborts the Submit Quote flow.
      // The listener just needs to exist — we do NOT close the tab here since
      // PartsTech sends messages on load too, not just on cart actions.
      // Tab closing is handled by returnUrl pointing to partstech-close.html.
      const ptMessageHandler = (event) => {
        if (event.origin !== 'https://app.partstech.com') return;
        // Acknowledge the message — this prevents PartsTech's script from erroring.
        // Do not close the tab here; returnUrl handles that after cart action.
      };
      window.addEventListener('message', ptMessageHandler);

      // Store session and start polling
      setPtSessionId(data.session_id);
      startPolling(data.session_id);

    } catch (err) {
      console.error('Punchout error:', err);
      setPtError('Network error — please try again');
    }

    setPtLoading(false);
  };

  const handleCancelPunchout = () => {
    stopPolling();
    setPtSessionId(null);
    setPtError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Quote generation
  // ─────────────────────────────────────────────────────────────────────────
  const cartTotal = cart.reduce((sum, op) => sum + Number(op.labor_price) * (op.quantity || 1), 0);
  const partsTotal = parts.reduce((sum, p) => sum + ((p.unit_price || 0) * p.quantity), 0);

  // Tax rates by store — matches quote_config tax_rates values
  const STORE_TAX_RATES = {
    609:  0.0875, 1002: 0.0875, 1257: 0.0875,
    1270: 0.0875, 1396: 0.0925, 1932: 0.0875,
    2911: 0.0875, 4182: 0.0925,
  };
  const storeTaxRate = STORE_TAX_RATES[Number(selectedStore)] || 0.0875;

  const handleSubmitRevision = async () => {
    if (cart.length === 0) { setRevisionError('Add at least one service'); return; }
    if (!revisionContext?.quote_id) { setRevisionError('Revision context lost — please go back to the quote'); return; }
    // Unified editor model: hand the selected labor back to the quote editor as
    // STAGED lines instead of committing here. No authorization note at this
    // step — the editor asks for the reason once, at Recalculate & Save, and
    // the labor gets bucketed into a job there alongside everything else.
    try {
      const items = cart.map((op) => ({
        is_manual:                op.is_manual === true,
        mechanical_estimating_id: op.mechanical_estimating_id,
        motor_db_section:         op.motor_db_section,
        motor_db_group:           op.motor_db_group,
        motor_db_subgroup:        op.motor_db_subgroup,
        motor_db_operation:       op.motor_db_operation,
        qualifier_description:    op.qualifier_description,
        motor_time:               op.motor_time,
        labor_price:              op.labor_price,
        motor_db_description:     op.motor_db_description,
        motor_db_footnote:        op.motor_db_footnote,
        is_additional_operation:  op.is_additional_operation,
        quantity:                 op.quantity || 1,
      }));
      sessionStorage.setItem('jl_revision_return', JSON.stringify({
        short_code: revisionContext.short_code,
        quote_id:   revisionContext.quote_id,
        items,
      }));
    } catch (e) {
      setRevisionError('Could not hand labor back to the quote — please try again');
      return;
    }
    window.location.hash = `#/mechanical/${revisionContext.short_code}`;
  };

  const handleGenerateQuote = async (skipPlateVinCheck = false) => {
    if (cart.length === 0) return;
    if (!selectedEmployee) { setError('Please select an employee'); return; }
    // Soft gate — require plate or VIN for PartsTech pre-population
    if (!skipPlateVinCheck && !custPlate && !custVin) {
      setShowPlateVinWarning(true);
      return;
    }
    setShowPlateVinWarning(false);
    setLoading(true);
    setError('');
    try {
      const body = {
        store_id: Number(selectedStore),
        employee: {
          user_id:   selectedEmployee?.user_id || selectedEmployee?.employee_id || null,
          user_name: selectedEmployee?.user_name || selectedEmployee?.display_name || 'CSA',
        },
        customer: {
          first_name:    custFirstName  || undefined,
          last_name:     custLastName   || undefined,
          phone:         custPhone      || undefined,
          email:         custEmail      || undefined,
          license_plate: custPlate      || undefined,
          license_state: custPlate ? custPlateState : undefined,
          vin:           custVin        || undefined,
          data_source:   custDataSource,
        },
        vehicle: {
          year:             Number(selYear),
          make:             selMake,
          model:            selModel,
          submodel:         selSubmodel,
          display:          `${selYear} ${selMake} ${selModel} ${selSubmodel}`.trim(),
          base_vehicle_id:  selConfig.base_vehicle_id,
          vehicle_id:       selConfig.vehicle_id       ?? null,
          engine_config_id: selConfig.engine_config_id ?? null,
          config:           selConfig,
        },
        parts: parts.map((p) => ({
          part_number:              p.part_number              || undefined,
          description:              p.description,
          quantity:                 p.quantity,
          unit_price:               p.unit_price,
          source:                   p.source                   || 'manual',
          cost_price:               p.cost_price               ?? undefined,
          partstech_order_item_id:  p.partstech_order_item_id  || undefined,
          partstech_session_id:     p.partstech_session_id     || undefined,
          partstech_store_id:       p.partstech_store_id       || undefined,
          job_temp_id:              p._job_temp_id             || undefined,
        })),
        items: cart.map((op) => ({
          is_manual:                op.is_manual === true,
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
          quantity:                 op.quantity || 1,
          job_temp_id:              op._job_temp_id || undefined,
        })),
        // Optional CSA-named groupings. Server prunes any job not referenced by
        // an item/part, so sending all is safe. sort_order = display order.
        jobs: jobs.map((j, i) => ({ temp_id: j.temp_id, label: j.label, sort_order: i })),
        notes: quoteNotes || undefined,
        from_greet_short_code: greetLink?.short_code || undefined,
        from_greet_store_id:   greetLink?.store_id ?? undefined,
      };

      const res  = await apiCall(`${API_BASE}/generate-mechanical-quote`, {
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
    stopPolling();
    setStep('vehicle');
    setSelYear(''); setSelMake(''); setSelModel('');
    setSelSubmodel(''); setSelConfig(null);
    setTree([]); setOperations([]); setCart([]);
    setSelSection(''); setSelGroup(''); setSelSubgroup('');
    setSearchTerm('');
    setParts([]); setPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
    setManualLaborForm({ description: '', hours: '0.50' });
    setJobs([]); setJobForm('');
    setPtSessionId(null); setPtPolling(false); setPtError('');
    setCustFirstName(''); setCustLastName(''); setCustPhone('');
    setCustEmail(''); setCustPlate(''); setCustPlateState('CA');
    setCustVin(''); setVinInput(''); setLookupMode('plate');
    setPlateInput(''); setLookupResult(null); setCustDataSource('manual');
    setPendingMake(''); setPendingModel('');
    setQuoteNotes(''); setGeneratedQuote(null); setError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived tree structure
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
  // Step progress
  // ─────────────────────────────────────────────────────────────────────────
  const stepDone = {
    vehicle:  ['submodel','config','browse','parts','submitted'].includes(step),
    submodel: ['config','browse','parts','submitted'].includes(step),
    config:   ['browse','parts','submitted'].includes(step),
    browse:   ['parts','submitted'].includes(step),
    parts:    step === 'submitted',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <Navbar
        currentPage="mechanical"
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Plate/VIN soft gate modal ── */}
        {showPlateVinWarning && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '12px' }}>🪪</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700', color: DARK, textAlign: 'center' }}>No Plate or VIN Captured</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: '1.5' }}>
                A license plate or VIN is needed to pre-load the vehicle in PartsTech when ordering parts. Enter one now, or skip for phone-in customers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setShowPlateVinWarning(false)} style={{
                  padding: '12px', border: `2px solid ${PURPLE}`, borderRadius: '25px',
                  backgroundColor: LIGHT, color: PURPLE, fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}>
                  ← Enter Plate or VIN
                </button>
                <button onClick={() => { setShowPlateVinWarning(false); handleGenerateQuote(true); }} style={{
                  padding: '12px', border: `1px solid ${BORDER}`, borderRadius: '25px',
                  backgroundColor: 'white', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}>
                  Skip — Phone-in Customer
                </button>
              </div>
            </div>
          </div>
        )}

        {eachModalOp && (
          <EachModal
            op={eachModalOp}
            onConfirm={(qty) => { addToCart(eachModalOp, qty); setEachModalOp(null); }}
            onCancel={() => setEachModalOp(null)}
          />
        )}

        {showAdvSearch && (
          <AdvancedSearchModal onSelect={handleAdvSearchSelect} onClose={() => setShowAdvSearch(false)} />
        )}

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
            <StepLabel n={5} label="Parts"    active={step==='parts'}    done={stepDone.parts} />
            <StepLabel n={6} label="Quote"    active={step==='submitted'} done={false} />
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── PLATE / VIN LOOKUP (visible until browse/parts/submitted) ── */}
        {step !== 'browse' && step !== 'parts' && step !== 'submitted' && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: lookupResult === 'found' || lookupResult === 'found_vehicle_only' ? '2px solid #86efac' : `1px solid ${BORDER}` }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: DARK, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              🔍 Customer Lookup <span style={{ fontSize: '11px', fontWeight: '400', color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>— optional, fills customer & vehicle</span>
            </h2>

            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {['plate', 'vin'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setLookupMode(mode); setLookupResult(null); }}
                  style={{
                    padding: '5px 16px', borderRadius: '20px', border: `2px solid ${lookupMode === mode ? PURPLE : BORDER}`,
                    background: lookupMode === mode ? LIGHT : 'white',
                    color: lookupMode === mode ? PURPLE : '#64748b',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}
                >
                  {mode === 'plate' ? '🔖 Plate' : '🔑 VIN'}
                </button>
              ))}
            </div>

            {/* Plate input */}
            {lookupMode === 'plate' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '520px' }}>
                <select value={plateState} onChange={(e) => setPlateState(e.target.value)}
                  style={{ padding: '10px 8px', border: `2px solid ${PURPLE}`, borderRadius: '25px', fontSize: '13px', width: '72px', outline: 'none', fontWeight: '600', appearance: 'none', textAlign: 'center' }}>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" placeholder="License plate" value={plateInput}
                  onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlateLookup()}
                  style={{ ...inputStyle, width: '180px', fontSize: '15px', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', textAlign: 'center' }}
                  onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER}
                />
                <button onClick={handlePlateLookup} disabled={lookupLoading || !plateInput.trim()} style={{
                  padding: '10px 20px', backgroundColor: lookupLoading || !plateInput.trim() ? '#ccc' : PURPLE,
                  color: 'white', border: 'none', borderRadius: '25px', fontSize: '13px', fontWeight: '700',
                  cursor: lookupLoading || !plateInput.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}>{lookupLoading ? 'Looking up…' : 'Look Up'}</button>
              </div>
            )}

            {/* VIN input */}
            {lookupMode === 'vin' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '520px' }}>
                <input
                  type="text" placeholder="17-character VIN" value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVinLookup()}
                  maxLength={17}
                  style={{ ...inputStyle, flex: 1, fontSize: '14px', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', fontFamily: 'monospace' }}
                  onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER}
                />
                <div style={{ fontSize: '11px', color: vinInput.length === 17 ? GREEN : '#94a3b8', fontWeight: '700', flexShrink: 0, minWidth: '32px' }}>
                  {vinInput.length}/17
                </div>
                <button onClick={handleVinLookup} disabled={lookupLoading || vinInput.length !== 17} style={{
                  padding: '10px 20px', backgroundColor: lookupLoading || vinInput.length !== 17 ? '#ccc' : PURPLE,
                  color: 'white', border: 'none', borderRadius: '25px', fontSize: '13px', fontWeight: '700',
                  cursor: lookupLoading || vinInput.length !== 17 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}>{lookupLoading ? 'Looking up…' : 'Look Up'}</button>
              </div>
            )}

            {/* Result messages */}
            {lookupResult === 'found' && (
              <div style={{ marginTop: '10px', backgroundColor: '#f0fff4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                ✓ Customer found — fields pre-filled
                {(selYear || selMake) && <span style={{ color: '#15803d' }}>· Vehicle: {selYear} {selMake} {selModel}</span>}
              </div>
            )}
            {lookupResult === 'found_vehicle_only' && (
              <div style={{ marginTop: '10px', backgroundColor: '#f0fff4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                ✓ Vehicle identified — no customer record found
                {(selYear || selMake) && <span style={{ color: '#15803d' }}>· {selYear} {selMake} {selModel}</span>}
              </div>
            )}
            {lookupResult === 'not_found' && (
              <div style={{ marginTop: '10px', backgroundColor: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#854d0e' }}>
                No match found — select vehicle manually below
              </div>
            )}
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
              <SelectDropdown value={selYear}  onChange={setSelYear}  options={years.map(String)} placeholder="Year" />
              <SelectDropdown value={selMake}  onChange={setSelMake}  options={makes}  placeholder="Make"  disabled={!selYear} />
              <SelectDropdown value={selModel} onChange={setSelModel} options={models} placeholder="Model" disabled={!selMake} />
            </div>
            {loading && <div style={{ marginTop: '12px', fontSize: '13px', color: '#888' }}>Loading…</div>}
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
                <button key={sm} onClick={() => setSelSubmodel(sm)} style={{
                  padding: '12px 16px', border: `2px solid ${selSubmodel === sm ? PURPLE : BORDER}`,
                  borderRadius: '10px', backgroundColor: selSubmodel === sm ? LIGHT : 'white',
                  color: selSubmodel === sm ? PURPLE : DARK, fontSize: '13px',
                  fontWeight: selSubmodel === sm ? '700' : '500', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                  {sm}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2b: Config Picker
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
                <button key={i} onClick={() => handleSelectConfig(cfg)} style={{
                  padding: '14px 16px', border: `2px solid ${BORDER}`, borderRadius: '10px',
                  backgroundColor: 'white', color: DARK, fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', textAlign: 'left', lineHeight: '1.5', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.backgroundColor = LIGHT; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.backgroundColor = 'white'; }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: PURPLE, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {cfg.engine_liter}L {cfg.engine_cylinders === '4' ? 'L4' : cfg.engine_cylinders === '6' ? 'V6' : cfg.engine_cylinders === '8' ? 'V8' : cfg.engine_cylinders + '-cyl'}
                    {cfg.fuel_type_name && cfg.fuel_type_name !== 'GAS' && cfg.fuel_type_name !== 'U/K' && (
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                        backgroundColor: cfg.fuel_type_name === 'DIESEL' ? '#fef3c7' : '#f0fdf4',
                        color: cfg.fuel_type_name === 'DIESEL' ? '#92400e' : '#166534',
                      }}>{cfg.fuel_type_name}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{cfg.drive_type_name}</div>
                  {cfg.front_brake_type && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Brakes: {cfg.front_brake_type} / {cfg.rear_brake_type}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4: Browse Labor
        ══════════════════════════════════════════════════════════════════ */}
        {(step === 'browse' || revisionMode) && selConfig && (
          <>
            {/* Vehicle summary banner */}
            <div style={{ backgroundColor: DARK, borderRadius: '12px', padding: '14px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                  🚗 {selYear} {selMake} {selModel} {selSubmodel}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {selConfig.engine_liter}L · {selConfig.drive_type_name}
                </span>
              </div>
              {!revisionMode && (
                <button onClick={() => { setStep('submodel'); setSelConfig(null); }}
                  style={{ background: 'none', border: `1px solid #475569`, borderRadius: '20px', color: '#94a3b8', fontSize: '11px', fontWeight: '600', padding: '4px 12px', cursor: 'pointer' }}>
                  ← Change Vehicle
                </button>
              )}
              {revisionMode && revisionContext && (
                <span style={{ fontSize: '12px', color: AMBER, fontWeight: '700' }}>
                  ✏️ REVISION MODE — {revisionContext.vehicle_display}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', gap: '16px', alignItems: 'start' }}>

              {/* ── Left: Category tree ── */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', padding: '0 4px' }}>
                  Categories
                </div>
                {Object.entries(treeGrouped).map(([section, groups]) => (
                  <div key={section}>
                    <button onClick={() => toggleSection(section)} style={{
                      width: '100%', textAlign: 'left', padding: '7px 8px', border: 'none',
                      background: expandedSections[section] ? LIGHT : 'white',
                      borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                      color: expandedSections[section] ? PURPLE : DARK, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{section}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{expandedSections[section] ? '▲' : '▼'}</span>
                    </button>
                    {expandedSections[section] && Object.entries(groups).map(([group, subgroups]) => (
                      <div key={group} style={{ marginLeft: '8px' }}>
                        <button onClick={() => toggleGroup(`${section}:${group}`)} style={{
                          width: '100%', textAlign: 'left', padding: '5px 8px', border: 'none',
                          background: expandedGroups[`${section}:${group}`] ? '#f8fafc' : 'white',
                          borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          color: '#475569', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span>{group}</span>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>{expandedGroups[`${section}:${group}`] ? '▲' : '▼'}</span>
                        </button>
                        {expandedGroups[`${section}:${group}`] && subgroups.map((row) => (
                          <button key={row.motor_db_subgroup} onClick={() => handleTreeClick(section, group, row.motor_db_subgroup)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '4px 8px 4px 16px', border: 'none',
                              background: selSubgroup === row.motor_db_subgroup ? LIGHT : 'white',
                              borderRadius: '4px', fontSize: '11px',
                              color: selSubgroup === row.motor_db_subgroup ? PURPLE : '#64748b',
                              fontWeight: selSubgroup === row.motor_db_subgroup ? '700' : '400',
                              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                            <span>{row.motor_db_subgroup}</span>
                            <span style={{ fontSize: '9px', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '1px 5px', color: '#94a3b8' }}>
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
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search operations (e.g. front pads, oil filter, serpentine)…"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) { setSelSection(''); setSelGroup(''); setSelSubgroup(''); } }}
                    style={{ width: '100%', padding: '10px 16px 10px 36px', border: `2px solid ${BORDER}`, borderRadius: '25px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = PURPLE}
                    onBlur={(e) => e.target.style.borderColor = BORDER}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#94a3b8' }}>🔍</span>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>×</button>
                  )}
                </div>

                {selSubgroup && !searchTerm && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                    {selSection} › {selGroup} › <strong style={{ color: DARK }}>{selSubgroup}</strong>
                  </div>
                )}

                {opsLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>Loading operations…</div>}
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
                        <div key={op.mechanical_estimating_id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: '8px', gap: '10px',
                          backgroundColor: inCart ? LIGHT : op.is_additional_operation ? '#fafafa' : 'white',
                          border: `1px solid ${inCart ? PURPLE : op.is_additional_operation ? '#f0e8ff' : BORDER}`,
                          marginLeft: op.is_additional_operation ? '16px' : '0',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              {op.is_additional_operation && (
                                <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#f0e8ff', color: PURPLE, borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>ADD-ON</span>
                              )}
                              {isEachOperation(op) && !isInCart(op.mechanical_estimating_id) && (
                                <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>EACH</span>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: '600', color: DARK }}>{op.motor_db_operation}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#f1f5f9', borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>{op.qualifier_description}</span>
                            </div>
                            {searchTerm && <div style={{ fontSize: '10px', color: '#94a3b8' }}>{op.motor_db_section} › {op.motor_db_subgroup}</div>}
                            {op.motor_db_description && <div style={{ fontSize: '11px', color: '#475569', fontWeight: '500', marginBottom: '2px' }}>{op.motor_db_description}</div>}
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {op.motor_time} hrs × $199.99 =&nbsp;
                              <strong style={{ color: DARK }}>{formatCurrency(op.labor_price)}</strong>
                            </div>
                            {op.motor_db_footnote && <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>ℹ️ {op.motor_db_footnote}</div>}
                          </div>
                          <button onClick={() => handleAddClick(op)} style={{
                            flexShrink: 0, padding: '6px 14px',
                            border: `2px solid ${inCart ? PURPLE : BORDER}`, borderRadius: '20px',
                            backgroundColor: inCart ? PURPLE : 'white',
                            color: inCart ? 'white' : '#64748b',
                            fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}>
                            {inCart ? '✓ Added' : isEachOperation(op) ? '+ Add (qty)' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Right: Cart + CTA ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Labor cart */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quote Items</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: PURPLE }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
                  </div>

                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '12px' }}>No items added yet</div>
                  ) : (
                    <>
                      {cart.map((op) => (
                        <React.Fragment key={op.client_id ?? op.mechanical_estimating_id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: `1px solid ${BORDER}`, gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: DARK, lineHeight: '1.3' }}>
                                {op.motor_db_operation}
                                {op.qualifier_description && <span style={{ color: '#94a3b8', fontWeight: '400' }}> · {op.qualifier_description}</span>}
                                {op.is_manual && (
                                  <span style={{ marginLeft: '6px', display: 'inline-block', backgroundColor: AMBER, color: 'white', fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px', verticalAlign: 'middle' }}>MANUAL</span>
                                )}
                              </div>
                              {op.motor_db_description && <div style={{ fontSize: '10px', color: '#475569' }}>{op.motor_db_description}</div>}
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{op.motor_time} hrs{op.is_manual ? '' : ' ea.'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {!op.is_manual && (
                                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
                                  <button onClick={() => setCart((prev) => prev.map((c) => c.client_id === op.client_id ? { ...c, quantity: Math.max(1, (c.quantity || 1) - 1) } : c))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', fontSize: '14px', color: '#64748b', lineHeight: 1 }}>−</button>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, minWidth: '16px', textAlign: 'center' }}>{op.quantity || 1}</span>
                                  <button onClick={() => setCart((prev) => prev.map((c) => c.client_id === op.client_id ? { ...c, quantity: (c.quantity || 1) + 1 } : c))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', fontSize: '14px', color: '#64748b', lineHeight: 1 }}>+</button>
                                </div>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: '700', color: DARK, minWidth: '60px', textAlign: 'right' }}>{formatCurrency(Number(op.labor_price) * (op.quantity || 1))}</span>
                              <button onClick={() => setCart((prev) => prev.filter((c) => c.client_id !== op.client_id))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: '0' }}>×</button>
                            </div>
                          </div>
                          {!op.is_manual && isEachOperation(op) && (op.quantity||1) === 1 && (
                            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px', margin: '4px 0', fontSize: '10px', color: '#92400e' }}>
                              ⚠️ Priced per unit — confirm quantity is correct
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: DARK }}>Labor Total</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: PURPLE }}>{formatCurrency(cartTotal)}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Labor is not taxed · Add parts next</div>
                    </>
                  )}

                  {/* ── Add Manual Labor form ──────────────────────────────
                      Always visible — even with empty cart — so CSA can add
                      misc labor without first picking a MOTOR operation.
                      Sanitizes description to alphanumeric + space + common
                      punctuation (same sanitization server-side).
                      Hours dropdown: 15-min increments, 0.25 to 3.0. */}
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '12px', marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Add Manual Labor
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input type="text" placeholder="Description (e.g. Remove aftermarket skid plate) *"
                        value={manualLaborForm.description}
                        onChange={(e) => setManualLaborForm((f) => ({
                          ...f,
                          description: e.target.value.replace(/[^A-Za-z0-9 \-\/\.&()]/g, '').slice(0, 120),
                        }))}
                        maxLength={120}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => e.target.style.borderColor = PURPLE}
                        onBlur={(e) => e.target.style.borderColor = BORDER}
                      />
                      <select
                        value={manualLaborForm.hours}
                        onChange={(e) => setManualLaborForm((f) => ({ ...f, hours: e.target.value }))}
                        style={{ ...inputStyle, width: '90px' }}
                        onFocus={(e) => e.target.style.borderColor = PURPLE}
                        onBlur={(e) => e.target.style.borderColor = BORDER}
                      >
                        {['0.25','0.50','0.75','1.00','1.25','1.50','1.75','2.00','2.25','2.50','2.75','3.00'].map((h) => (
                          <option key={h} value={h}>{h} hr</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const desc = manualLaborForm.description.trim();
                        const hrs  = parseFloat(manualLaborForm.hours);
                        if (!desc || !hrs) return;
                        // Display price only — server recomputes from quote_config on save
                        const displayLaborRate = 199.99;
                        setCart((prev) => [...prev, {
                          client_id:                nextClientId(),
                          is_manual:                true,
                          mechanical_estimating_id: null,
                          motor_db_section:         'MANUAL',
                          motor_db_group:           'MANUAL LABOR',
                          motor_db_subgroup:        'MANUAL LABOR',
                          motor_db_operation:       desc,
                          qualifier_description:    null,
                          motor_time:               hrs,
                          labor_price:              Math.round(hrs * displayLaborRate * 100) / 100,
                          is_additional_operation:  false,
                          quantity:                 1,
                        }]);
                        setManualLaborForm({ description: '', hours: '0.50' });
                      }}
                      disabled={!manualLaborForm.description.trim()}
                      style={{
                        width: '100%', padding: '8px', border: `2px solid ${BORDER}`, borderRadius: '6px',
                        backgroundColor: !manualLaborForm.description.trim() ? '#f5f5f5' : LIGHT,
                        color: !manualLaborForm.description.trim() ? '#94a3b8' : PURPLE,
                        fontSize: '12px', fontWeight: '700',
                        cursor: !manualLaborForm.description.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >+ Add Manual Labor</button>
                  </div>
                </div>

                {/* Revision mode submit — hands labor back to the quote editor
                    (no auth note here; the editor asks the reason once at save) */}
                {revisionMode ? (
                  <div>
                    <p style={{ fontSize: '11px', color: '#92400e', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                      These services return to the quote as staged labor — assign them to a job and save from there.
                    </p>
                    {revisionError && <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '6px' }}>{revisionError}</div>}
                    <button onClick={handleSubmitRevision} disabled={cart.length === 0}
                      style={{
                        width: '100%', padding: '14px', border: 'none', borderRadius: '25px',
                        backgroundColor: cart.length === 0 ? '#ccc' : '#92400e',
                        color: 'white', fontSize: '14px', fontWeight: '700',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                      }}>
                      {`← Add to Quote · ${formatCurrency(cartTotal)}`}
                    </button>
                    {cart.length === 0 && <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>Add services above</div>}
                  </div>
                ) : (
                  /* Add Parts button — advances to parts step */
                  <button
                    onClick={handleGoToParts}
                    disabled={cart.length === 0}
                    style={{
                      width: '100%', padding: '14px', border: 'none', borderRadius: '25px',
                      backgroundColor: cart.length === 0 ? '#ccc' : PURPLE,
                      color: 'white', fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px',
                      cursor: cart.length === 0 ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
                    }}
                  >
                    {cart.length === 0 ? 'Add Services Above' : `Add Parts → (${cart.length} service${cart.length !== 1 ? 's' : ''})`}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5: Parts + Customer + Generate Quote
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'parts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

            {/* ── Left: Parts ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Jobs (optional grouping) */}
              {!revisionMode && (
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Jobs <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.4 }}>
                    Group services and parts into jobs (e.g. “Front Brakes”) to show per-job subtotals on the customer quote. Leave empty for a single flat quote.
                  </div>

                  {jobs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      {jobs.map((j, idx) => (
                        <div
                          key={j.temp_id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => { moveJob(dragJobIndex, idx); setDragJobIndex(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            borderRadius: '6px', padding: '2px',
                            backgroundColor: dragJobIndex != null && dragJobIndex !== idx ? '#faf5ff' : 'transparent',
                            opacity: dragJobIndex === idx ? 0.5 : 1,
                          }}
                        >
                          <span
                            draggable
                            onDragStart={() => setDragJobIndex(idx)}
                            onDragEnd={() => setDragJobIndex(null)}
                            title="Drag to reorder"
                            style={{ cursor: 'grab', color: '#cbd5e1', fontSize: '15px', lineHeight: 1, padding: '0 2px', userSelect: 'none' }}
                          >⠿</span>
                          <input
                            type="text"
                            value={j.label}
                            onChange={(e) => renameJob(j.temp_id, e.target.value)}
                            style={{ ...inputStyle, flex: 1 }}
                            onFocus={(e) => e.target.style.borderColor = PURPLE}
                            onBlur={(e) => e.target.style.borderColor = BORDER}
                          />
                          <button onClick={() => removeJob(j.temp_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="New job name (e.g. Front Brakes)"
                      value={jobForm}
                      onChange={(e) => setJobForm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addJob(); }}
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={(e) => e.target.style.borderColor = PURPLE}
                      onBlur={(e) => e.target.style.borderColor = BORDER}
                    />
                    <button
                      onClick={addJob}
                      disabled={!jobForm.trim()}
                      style={{
                        padding: '8px 14px', border: `2px solid ${BORDER}`, borderRadius: '6px',
                        backgroundColor: !jobForm.trim() ? '#f5f5f5' : LIGHT,
                        color: !jobForm.trim() ? '#94a3b8' : PURPLE,
                        fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap',
                        cursor: !jobForm.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >+ Add Job</button>
                  </div>
                </div>
              )}

              {/* Labor summary (read-only) */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Labor — {selYear} {selMake} {selModel}
                  </span>
                  <button onClick={() => setStep('browse')} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: '20px', color: '#64748b', fontSize: '11px', fontWeight: '600', padding: '3px 10px', cursor: 'pointer' }}>
                    ← Edit Labor
                  </button>
                </div>
                {cart.map((op) => (
                  <div key={op.client_id ?? op.mechanical_estimating_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${BORDER}`, fontSize: '12px', gap: '8px' }}>
                    <span style={{ color: DARK, fontWeight: '600', minWidth: 0 }}>
                      {op.motor_db_operation}
                      {op.qualifier_description && <span style={{ color: '#94a3b8', fontWeight: '400' }}> · {op.qualifier_description}</span>}
                      {op.is_manual && (
                        <span style={{ marginLeft: '6px', display: 'inline-block', backgroundColor: AMBER, color: 'white', fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.5px', verticalAlign: 'middle' }}>MANUAL</span>
                      )}
                      {(op.quantity || 1) > 1 && <span style={{ color: PURPLE, fontWeight: '700' }}> ×{op.quantity}</span>}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                      {renderJobPicker(op._job_temp_id, (v) => assignItemJob(op.client_id, v))}
                      <span style={{ fontWeight: '700', color: DARK }}>{formatCurrency(Number(op.labor_price) * (op.quantity || 1))}</span>
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: DARK }}>Labor Subtotal</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: PURPLE }}>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Parts section */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Parts <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </span>
                  {parts.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: '700', color: PURPLE }}>{parts.length} part{parts.length !== 1 ? 's' : ''} · {formatCurrency(partsTotal)}</span>
                  )}
                </div>

                {/* PartsTech punchout button */}
                <div style={{ marginBottom: '14px' }}>
                  {!ptPolling ? (
                    <button
                      onClick={handlePunchout}
                      disabled={ptLoading}
                      style={{
                        width: '100%', padding: '11px 16px',
                        border: `2px solid ${ptLoading ? '#ddd' : '#0ea5e9'}`,
                        borderRadius: '10px', backgroundColor: ptLoading ? '#f5f5f5' : '#f0f9ff',
                        color: ptLoading ? '#94a3b8' : '#0369a1',
                        fontSize: '13px', fontWeight: '700', cursor: ptLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      }}
                    >
                      {ptLoading ? (
                        <>⏳ Opening PartsTech…</>
                      ) : (
                        <>🔍 Find Parts on PartsTech</>
                      )}
                    </button>
                  ) : (
                    /* Polling state — subtle indicator, form stays usable */
                    <div style={{ backgroundColor: '#f0f9ff', border: '2px solid #7dd3fc', borderRadius: '10px', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', animation: 'spin 1.5s linear infinite' }}>⏳</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>Waiting for PartsTech…</div>
                          <div style={{ fontSize: '10px', color: '#0284c7' }}>Add parts to your cart and click Submit Quote</div>
                        </div>
                      </div>
                      <button onClick={handleCancelPunchout} style={{
                        background: 'none', border: `1px solid #7dd3fc`, borderRadius: '20px',
                        color: '#0369a1', fontSize: '11px', fontWeight: '600', padding: '3px 10px', cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {ptError && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '6px 10px' }}>
                      ⚠️ {ptError}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Or Add Manually
                  </div>

                  {/* Parts list */}
                  {parts.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {parts.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          padding: '8px 0', borderBottom: `1px solid ${BORDER}`, gap: '8px',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: DARK }}>{p.description}</span>
                              {p.source === 'partstech' && (
                                <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#f0f9ff', color: '#0369a1', borderRadius: '4px', padding: '1px 5px', border: '1px solid #7dd3fc', flexShrink: 0 }}>PT</span>
                              )}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                              {p.part_number && <span>{p.part_number} · </span>}
                              {p.supplier && <span>{p.supplier} · </span>}
                              {p.quantity} × {formatCurrency(p.unit_price)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {renderJobPicker(p._job_temp_id, (v) => assignPartJob(i, v))}
                            <span style={{ fontSize: '12px', fontWeight: '700', color: DARK }}>{formatCurrency(p.quantity * p.unit_price)}</span>
                            <button onClick={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual add form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input type="text" placeholder="Part Number (optional)"
                      value={partForm.part_number}
                      onChange={(e) => setPartForm((p) => ({ ...p, part_number: e.target.value }))}
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = PURPLE}
                      onBlur={(e) => e.target.style.borderColor = BORDER}
                    />
                    <input type="text" placeholder="Description *"
                      value={partForm.description}
                      onChange={(e) => setPartForm((p) => ({ ...p, description: e.target.value }))}
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = PURPLE}
                      onBlur={(e) => e.target.style.borderColor = BORDER}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="number" placeholder="Qty" min="1"
                        value={partForm.quantity}
                        onChange={(e) => setPartForm((p) => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        style={{ ...inputStyle, width: '60px' }}
                        onFocus={(e) => e.target.style.borderColor = PURPLE}
                        onBlur={(e) => e.target.style.borderColor = BORDER}
                      />
                      <input type="number" placeholder="Unit Price *" min="0" step="0.01"
                        value={partForm.unit_price}
                        onChange={(e) => setPartForm((p) => ({ ...p, unit_price: e.target.value }))}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => e.target.style.borderColor = PURPLE}
                        onBlur={(e) => e.target.style.borderColor = BORDER}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!partForm.description.trim() || !partForm.unit_price) return;
                        setParts((prev) => [...prev, {
                          part_number: partForm.part_number.trim() || null,
                          description: partForm.description.trim(),
                          quantity:    partForm.quantity,
                          unit_price:  parseFloat(partForm.unit_price),
                          source:      'manual',
                        }]);
                        setPartForm({ part_number: '', description: '', quantity: 1, unit_price: '' });
                      }}
                      disabled={!partForm.description.trim() || !partForm.unit_price}
                      style={{
                        padding: '8px', border: `2px solid ${BORDER}`, borderRadius: '6px',
                        backgroundColor: !partForm.description.trim() || !partForm.unit_price ? '#f5f5f5' : LIGHT,
                        color: !partForm.description.trim() || !partForm.unit_price ? '#94a3b8' : PURPLE,
                        fontSize: '12px', fontWeight: '700',
                        cursor: !partForm.description.trim() || !partForm.unit_price ? 'not-allowed' : 'pointer',
                      }}
                    >+ Add Part Manually</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Customer + Employee + Generate ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Customer */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Customer <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                </div>
                <button onClick={() => setShowAdvSearch(true)} style={{ background: 'none', border: 'none', color: PURPLE, fontSize: '11px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline', padding: '0 0 10px 0', display: 'block' }}>
                  🔍 Search by Name or Phone
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input type="text" placeholder="First Name" value={custFirstName} onChange={(e) => setCustFirstName(e.target.value)} style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
                  <input type="text" placeholder="Last Name" value={custLastName} onChange={(e) => setCustLastName(e.target.value)} style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <input type="tel" placeholder="Phone" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <input type="email" placeholder="Email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input type="text" placeholder="Plate" value={custPlate} onChange={(e) => setCustPlate(e.target.value.toUpperCase())} style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }}
                    onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
                  <select value={custPlateState} onChange={(e) => setCustPlateState(e.target.value)}
                    style={{ padding: '8px 6px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', width: '60px', outline: 'none' }}>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <textarea placeholder="Notes (optional)" value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={(e) => e.target.style.borderColor = PURPLE} onBlur={(e) => e.target.style.borderColor = BORDER} />
              </div>

              {/* Employee */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Prepared By</div>
                <select
                  value={selectedEmployee ? (selectedEmployee.employee_id || selectedEmployee.user_id) : ''}
                  onChange={(e) => { const emp = employees.find((em) => String(em.employee_id || em.user_id) === e.target.value); setSelectedEmployee(emp || null); }}
                  style={{ ...inputStyle, appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239b59b6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id || emp.user_id} value={emp.employee_id || emp.user_id}>{emp.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Quote summary + Generate */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: DARK, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Quote Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  <span>Labor ({cart.length} service{cart.length !== 1 ? 's' : ''})</span>
                  <span style={{ fontWeight: '600', color: DARK }}>{formatCurrency(cartTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  <span>Parts ({parts.length} item{parts.length !== 1 ? 's' : ''})</span>
                  <span style={{ fontWeight: '600', color: DARK }}>{formatCurrency(partsTotal)}</span>
                </div>
                {partsTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    <span>Tax ({(storeTaxRate * 100).toFixed(2)}%) on parts</span>
                    <span style={{ fontWeight: '600', color: DARK }}>{formatCurrency(partsTotal * storeTaxRate)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: DARK, borderTop: `1px solid ${BORDER}`, paddingTop: '10px', marginBottom: '14px' }}>
                  <span>Est. Total</span>
                  <span style={{ color: PURPLE }}>{formatCurrency(cartTotal + partsTotal + (partsTotal * storeTaxRate))}</span>
                </div>

                <PurpleButton onClick={handleGenerateQuote} disabled={cart.length === 0 || loading || !selectedEmployee}>
                  {loading ? 'Generating…' : 'Generate Quote'}
                </PurpleButton>
                {!selectedEmployee && (
                  <div style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center', marginTop: '6px' }}>Select an employee above</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 6: Quote Generated
        ══════════════════════════════════════════════════════════════════ */}
        {step === 'submitted' && generatedQuote && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '700', color: DARK }}>Quote Created</h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>{generatedQuote.vehicle_display}</p>

            <div style={{ backgroundColor: LIGHT, borderRadius: '10px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Quote #',   value: generatedQuote.quote_number },
                  { label: 'Store',     value: generatedQuote.store_name },
                  { label: 'Labor',     value: formatCurrency(generatedQuote.subtotal_labor) },
                  { label: 'Parts',     value: formatCurrency(generatedQuote.subtotal_parts) },
                  { label: 'Total',     value: formatCurrency(generatedQuote.total) },
                  { label: 'Expires',   value: new Date(generatedQuote.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: DARK }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <PurpleButton onClick={() => window.open(generatedQuote.short_url, '_blank')}>
                View Quote
              </PurpleButton>
              <button onClick={handleReset} style={{ padding: '12px 24px', border: `2px solid ${BORDER}`, borderRadius: '25px', backgroundColor: 'white', color: DARK, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                New Quote
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
