import React, { useState } from 'react';
import { apiCall, apiCallPublic, getStaffToken } from './apiClient';

/**
 * CustomerVehicleLookup — shared customer/vehicle lookup card.
 *
 * Used on TireFinder (public, PII gated by auth), EnterpriseTireFinder (staff-gated),
 * and FleetTireFinder (staff-gated). Provides license plate + VIN lookup against
 * the customer-lookup Edge Function, then fetches tire specs for the resolved
 * Y/M/M and surfaces the result back to the parent page.
 *
 * Behavioral model:
 *   - Component owns input/loading/error state internally.
 *   - On a successful lookup, it calls onLookupSuccess(result, tireSpecs) so
 *     the parent can store the result for click-through to QuoteBuilder.
 *   - When exactly one tire spec is found, it calls onSingleSpecResolved(spec)
 *     so the parent can auto-search inventory for that size.
 *   - On Clear, it calls onClear() so the parent can reset its own derived
 *     state (tire specs, inventory results, etc.).
 *   - The component reads localStorage.jl_staff_auth itself to gate PII display.
 *     Parents do not need to pass auth state.
 *   - When the user is signed in as staff, lookups go to the JWT-protected
 *     `customer-lookup` endpoint (returns full PII).
 *     When the user is a public visitor, lookups go to the public
 *     `vehicle-lookup` endpoint (returns vehicle YMM only — no PII).
 *
 * The `result` shape passed to onLookupSuccess matches what TireFinder previously
 * stored as `plateLookupResult`:
 *   {
 *     source: undefined | 'vin-turbo' | 'vin-nhtsa',
 *     vehicle: { year, make, model, display, motor_make, motor_model },
 *     customer: { first_name, last_name, full_name, phone, phone_raw, email,
 *                 license_plate, license_state, vin? }
 *   }
 *
 * Props:
 *   onLookupSuccess        (function, required) — called with (result, tireSpecsArray|null)
 *   onClear                (function, required) — called when user clicks CLEAR
 *   onSingleSpecResolved   (function, optional) — called with (spec) when exactly one tire spec is found
 *   tireSpecsCount         (number,   optional) — how many tire specs the parent currently holds.
 *                                                 When > 1, shows "↓ Select a tire size below" hint.
 *   hideStaffSigninHint    (boolean,  optional) — suppress the "Staff? Sign in" hint
 *                                                 (use on staff-gated pages where it's irrelevant)
 *   storeId                (string|number, required) — the active store ID. Required for plate
 *                                                      lookup because the Edge Function uses it to
 *                                                      authenticate against PartsTech for the
 *                                                      external plate decode fallback.
 */

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const STORAGE_KEY = 'jl_staff_auth';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// VIN format helper: strips non-VIN characters, uppercases, blocks I/O/Q,
// caps at 17 chars. Used in onChange to keep input clean as the user types.
const sanitizeVinInput = (raw) => {
  return raw
    .toUpperCase()
    .replace(/[IOQ]/g, '')          // I/O/Q never appear in real VINs
    .replace(/[^A-Z0-9]/g, '')      // strip non-alphanumeric
    .slice(0, 17);
};

// Read auth fresh from localStorage on each render. Cheap and correct.
const readIsAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
};

export default function CustomerVehicleLookup({
  onLookupSuccess,
  onClear,
  onSingleSpecResolved,
  tireSpecsCount = 0,
  hideStaffSigninHint = false,
  storeId,
}) {
  // ── Input state ──
  const [plate, setPlate] = useState('');
  const [stateCode, setStateCode] = useState('CA');
  const [vinInput, setVinInput] = useState('');

  // ── Network state ──
  const [plateLoading, setPlateLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [plateError, setPlateError] = useState(null);
  const [vinError, setVinError] = useState(null);

  // ── Result (kept locally for the result card display only;
  //         the parent gets its own copy via onLookupSuccess) ──
  const [result, setResult] = useState(null);

  const authed = readIsAuthenticated();

  // Resolve tire specs for a Y/M/M after a customer-lookup hit.
  // Returns { specs: array|null, errorMessage: string|null }.
  const fetchTireSpecsForVehicle = async (year, make, model) => {
    if (!year || !make || !model) {
      return { specs: null, errorMessage: null };
    }
    try {
      const tiresRes = await fetch(
        `${API_BASE}/vehicle-tires?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&key=TIRES2026`
      );
      const tiresData = await tiresRes.json();

      if (tiresData.success && tiresData.data && tiresData.data.length > 0) {
        return { specs: tiresData.data, errorMessage: null };
      }
      return { specs: null, errorMessage: 'no-specs' };
    } catch (e) {
      console.error('vehicle-tires fetch failed:', e);
      return { specs: null, errorMessage: 'fetch-failed' };
    }
  };

  // ── Plate lookup handler ──
  const handlePlateLookup = async () => {
    if (!plate.trim()) return;

    // storeId is required for plate lookup — the Edge Function uses it to
    // authenticate against PartsTech for the external plate decode fallback.
    if (!storeId) {
      setPlateError('Please select a store before performing a plate lookup.');
      return;
    }

    setPlateLoading(true);
    setPlateError(null);
    setVinError(null);
    setResult(null);

    try {
      // Staff users hit customer-lookup (returns full PII).
      // Public visitors hit vehicle-lookup (returns vehicle YMM only — no PII).
      const isStaff = !!getStaffToken();
      const lookupRes = isStaff
        ? await apiCall(
            `${API_BASE}/customer-lookup?plate=${encodeURIComponent(plate)}&state=${stateCode}&store_id=${encodeURIComponent(storeId)}`
          )
        : await apiCallPublic(
            `${API_BASE}/vehicle-lookup?plate=${encodeURIComponent(plate)}&state=${stateCode}&store_id=${encodeURIComponent(storeId)}`
          );
      const lookupData = await lookupRes.json();

      if (!lookupData.success || !lookupData.found) {
        setPlateError('No vehicle found for this plate. Try searching by vehicle or tire size below.');
        setPlateLoading(false);
        return;
      }

      // Normalize the response: customer-lookup returns vehicle data flattened
      // into the customer object; vehicle-lookup returns it under a `vehicle` key.
      // Build a uniform shape for downstream code.
      const respVehicle = lookupData.vehicle || lookupData.customer;
      const respCustomer = lookupData.customer || {};
      const motorMake = respVehicle?.motor_make || null;
      const motorModel = respVehicle?.motor_model || null;
      const vYear  = respVehicle?.year   || respVehicle?.vehicle_year;
      const vMake  = respVehicle?.make   || respVehicle?.vehicle_make;
      const vModel = respVehicle?.model  || respVehicle?.vehicle_model;
      const vYmm   = respVehicle?.ymm    || respVehicle?.vehicle_ymm;

      const newResult = {
        vehicle: {
          year: vYear,
          make: vMake,
          model: vModel,
          display: vYmm || `${vYear} ${vMake} ${vModel}`,
          motor_make: motorMake,
          motor_model: motorModel,
        },
        customer: {
          first_name:    respCustomer.first_name    || '',
          last_name:     respCustomer.last_name     || '',
          full_name:     respCustomer.full_name     || '',
          phone:         respCustomer.phone         || '',
          phone_raw:     respCustomer.phone_raw     || '',
          email:         respCustomer.email         || '',
          license_plate: respCustomer.license_plate || plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          license_state: respCustomer.license_state || stateCode,
        },
      };
      setResult(newResult);

      // Fetch tire specs and surface to parent
      const lookupMake = motorMake || vMake;
      const lookupModel = motorModel || vModel;
      const { specs, errorMessage } = await fetchTireSpecsForVehicle(
        vYear, lookupMake, lookupModel
      );

      if (errorMessage === 'no-specs') {
        setPlateError(`Found ${vYmm || 'vehicle'} but no tire specs in our database. Select a tire size below.`);
      }

      if (typeof onLookupSuccess === 'function') {
        onLookupSuccess(newResult, specs);
      }

      if (specs && specs.length === 1 && typeof onSingleSpecResolved === 'function') {
        onSingleSpecResolved(specs[0]);
      }
    } catch (e) {
      console.error('Plate lookup failed:', e);
      setPlateError('Lookup failed. Please try again or search manually.');
    }

    setPlateLoading(false);
  };

  // ── VIN lookup handler ──
  // Mirrors plate lookup: customer-lookup with search_type=vin, then vehicle-tires.
  // Source distinguished via result.source:
  //   - 'vin-turbo': customer match in our DB (returning customer)
  //   - 'vin-nhtsa': decoded via NHTSA only (new/unknown customer)
  const handleVinLookup = async () => {
    const vin = vinInput.trim().toUpperCase();
    if (vin.length !== 17) {
      setVinError('VIN must be exactly 17 characters.');
      return;
    }

    setVinLoading(true);
    setVinError(null);
    setPlateError(null);
    setResult(null);

    try {
      // Staff: customer-lookup (full PII). Public: vehicle-lookup (vehicle only).
      const isStaff = !!getStaffToken();
      const lookupRes = isStaff
        ? await apiCall(
            `${API_BASE}/customer-lookup?search_type=vin&vin=${encodeURIComponent(vin)}`
          )
        : await apiCallPublic(
            `${API_BASE}/vehicle-lookup?search_type=vin&vin=${encodeURIComponent(vin)}`
          );
      const lookupData = await lookupRes.json();

      if (!lookupData.success || !lookupData.found) {
        setVinError('VIN not found in customer records and could not be decoded. Try searching by vehicle or tire size below.');
        setVinLoading(false);
        return;
      }

      // Normalize the response (same pattern as plate handler).
      const respVehicle = lookupData.vehicle || lookupData.customer;
      const respCustomer = lookupData.customer || {};
      const isCustomerMatch = lookupData.source === 'turbo';
      const motorMake = respVehicle?.motor_make || null;
      const motorModel = respVehicle?.motor_model || null;
      const vYear  = respVehicle?.year   || respVehicle?.vehicle_year;
      const vMake  = respVehicle?.make   || respVehicle?.vehicle_make;
      const vModel = respVehicle?.model  || respVehicle?.vehicle_model;
      const vYmm   = respVehicle?.ymm    || respVehicle?.vehicle_ymm;

      const newResult = {
        source: isCustomerMatch ? 'vin-turbo' : 'vin-nhtsa',
        vehicle: {
          year: vYear,
          make: vMake,
          model: vModel,
          display: vYmm || `${vYear} ${vMake} ${vModel}`,
          motor_make: motorMake,
          motor_model: motorModel,
        },
        customer: {
          first_name:    respCustomer.first_name    || '',
          last_name:     respCustomer.last_name     || '',
          full_name:     respCustomer.full_name     || '',
          phone:         respCustomer.phone         || '',
          phone_raw:     respCustomer.phone_raw     || '',
          email:         respCustomer.email         || '',
          license_plate: respCustomer.license_plate || '',
          license_state: respCustomer.license_state || '',
          vin:           respCustomer.vin || respVehicle?.vin || vin,
        },
      };
      setResult(newResult);

      const lookupMake = motorMake || vMake;
      const lookupModel = motorModel || vModel;
      const { specs, errorMessage } = await fetchTireSpecsForVehicle(
        vYear, lookupMake, lookupModel
      );

      if (errorMessage === 'no-specs') {
        setVinError(`Found ${vYmm || 'vehicle'} but no tire specs in our database. Select a tire size below.`);
      }

      if (typeof onLookupSuccess === 'function') {
        onLookupSuccess(newResult, specs);
      }

      if (specs && specs.length === 1 && typeof onSingleSpecResolved === 'function') {
        onSingleSpecResolved(specs[0]);
      }
    } catch (e) {
      console.error('VIN lookup failed:', e);
      setVinError('Lookup failed. Please try again or search manually.');
    }

    setVinLoading(false);
  };

  const handleClear = () => {
    setPlate('');
    setVinInput('');
    setResult(null);
    setPlateError(null);
    setVinError(null);
    if (typeof onClear === 'function') onClear();
  };

  const plateButtonReady = plate.trim() && !plateLoading;
  const vinButtonReady   = vinInput.length === 17 && !vinLoading;

  return (
    <div style={{
      backgroundColor: '#f0fdf4',
      border: '2px solid #22c55e',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '25px',
    }}>
      <h3 style={{
        color: '#16a34a',
        fontSize: '13px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: '12px',
        textAlign: 'center',
      }}>
        🚗 Customer Vehicle Lookup
      </h3>
      <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginBottom: '15px' }}>
        Look up a vehicle by license plate or VIN
      </p>

      {/* Inline staff-login hint when not authenticated (suppressible on staff-gated pages) */}
      {!hideStaffSigninHint && !authed && (
        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#16a34a',
          marginTop: '-8px',
          marginBottom: '15px',
          fontStyle: 'italic',
        }}>
          Staff?{' '}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('jl:open-staff-login'))}
            style={{
              background: 'none',
              border: 'none',
              color: '#16a34a',
              fontWeight: '700',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: '11px',
              fontStyle: 'italic',
            }}
          >
            Sign in
          </button>
          {' '}to see customer details on lookup results.
        </p>
      )}

      {/* Plate row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <select
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          style={{
            padding: '10px 12px',
            border: '2px solid #22c55e',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '600',
            width: '80px',
            textAlign: 'center',
            outline: 'none',
          }}
        >
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePlateLookup(); }}
          placeholder="LICENSE PLATE"
          style={{
            padding: '10px 15px',
            border: '2px solid #22c55e',
            borderRadius: '25px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center',
            width: '180px',
            outline: 'none',
          }}
        />

        <button
          onClick={handlePlateLookup}
          disabled={!plateButtonReady}
          style={{
            backgroundColor: plateButtonReady ? '#22c55e' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: plateButtonReady ? 'pointer' : 'not-allowed',
          }}
        >
          {plateLoading ? 'SEARCHING...' : 'LOOK UP'}
        </button>

        {result && (
          <button
            onClick={handleClear}
            style={{
              backgroundColor: 'transparent',
              color: '#999',
              border: '1px solid #ccc',
              padding: '10px 15px',
              borderRadius: '25px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* OR divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0', gap: '10px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#bbf7d0' }} />
        <span style={{ color: '#16a34a', fontSize: '10px', fontWeight: '700', letterSpacing: '2px' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#bbf7d0' }} />
      </div>

      {/* VIN row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={vinInput}
          onChange={(e) => setVinInput(sanitizeVinInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleVinLookup(); }}
          placeholder="VIN (17 CHARACTERS)"
          maxLength={17}
          style={{
            padding: '10px 15px',
            border: '2px solid #22c55e',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textAlign: 'center',
            width: '280px',
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />

        <span style={{
          color: vinInput.length === 17 ? '#16a34a' : '#94a3b8',
          fontSize: '11px',
          fontWeight: '700',
          minWidth: '38px',
          textAlign: 'center',
        }}>
          {vinInput.length}/17
        </span>

        <button
          onClick={handleVinLookup}
          disabled={!vinButtonReady}
          style={{
            backgroundColor: vinButtonReady ? '#22c55e' : '#ccc',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: vinButtonReady ? 'pointer' : 'not-allowed',
          }}
        >
          {vinLoading ? 'SEARCHING...' : 'LOOK UP'}
        </button>
      </div>

      {/* Error Messages */}
      {plateError && (
        <p style={{ color: '#d97706', textAlign: 'center', marginTop: '12px', fontSize: '12px', fontWeight: '500' }}>
          {plateError}
        </p>
      )}
      {vinError && (
        <p style={{ color: '#d97706', textAlign: 'center', marginTop: '12px', fontSize: '12px', fontWeight: '500' }}>
          {vinError}
        </p>
      )}

      {/* Success Result */}
      {result && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #22c55e',
          borderRadius: '10px',
          padding: '15px',
          marginTop: '15px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '5px',
            flexWrap: 'wrap',
          }}>
            <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '11px', letterSpacing: '1px' }}>
              ✓ VEHICLE FOUND
            </span>
            {result.source === 'vin-nhtsa' && (
              <span style={{
                backgroundColor: '#fef3c7',
                color: '#b45309',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '1px',
                padding: '2px 8px',
                borderRadius: '10px',
                border: '1px solid #fde68a',
              }}>
                NEW CUSTOMER
              </span>
            )}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
            {result.vehicle.display}
          </div>
          {/* Customer/plate detail line — only when we have a Turbo match AND user is authenticated.
              Public users see vehicle Y/M/M only; PII is hidden. */}
          {authed && result.source !== 'vin-nhtsa' && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>
              {result.customer.license_plate && (
                <span>
                  Plate: {result.customer.license_plate}
                  {result.customer.license_state && ` (${result.customer.license_state})`}
                </span>
              )}
              {result.customer.full_name && (
                <span>
                  {result.customer.license_plate ? ' • ' : ''}
                  {result.customer.full_name}
                </span>
              )}
            </div>
          )}
          {/* For NHTSA-decoded VINs, show the decoded VIN */}
          {result.source === 'vin-nhtsa' && result.customer.vin && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px', fontFamily: 'monospace', letterSpacing: '1px' }}>
              VIN: {result.customer.vin}
            </div>
          )}
          {tireSpecsCount > 1 && (
            <div style={{ fontSize: '11px', color: '#9b59b6', marginTop: '8px', fontWeight: '600' }}>
              ↓ Select a tire size below
            </div>
          )}
        </div>
      )}
    </div>
  );
}
