import React, { useState } from 'react';
import { setStaffToken, apiCallPublic } from './apiClient';

import { API_BASE } from './config';
const STORAGE_KEY = 'jl_staff_auth';

/**
 * StaffLoginForm — reusable login form for staff PIN authentication.
 *
 * Extracted from StaffPinGate so the same form can be used in:
 *   - StaffPinGate (full-page login wall)
 *   - StaffLoginModal (overlay modal triggered from any public page)
 *
 * Props:
 *   onSuccess  (function) — called with the auth object after successful login.
 *                           Parent decides what to do (close modal, reload, etc.)
 *   compact    (boolean)  — when true, removes outer logo/title (useful for modals
 *                           where the title is rendered by the modal wrapper).
 */
export default function StaffLoginForm({ onSuccess, compact = false }) {
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !pin.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiCallPublic(`${API_BASE}/verify-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName.trim(),
          pin: pin.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        const auth = {
          employee_id:    data.employee.employee_id,
          user_id:        data.employee.user_id,
          user_name:      data.employee.user_name,
          first_name:     data.employee.first_name,
          last_name:      data.employee.last_name,
          display_name:   data.employee.display_name,
          store_id:       data.employee.home_store_id,
          authenticated_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        // Also set the active store to the employee's home store (mirrors StaffPinGate behavior)
        if (auth.store_id) {
          localStorage.setItem('jl_tire_store', String(auth.store_id));
        }
        // Store the staff JWT for protected Edge Function calls
        setStaffToken(data.token, data.expires_at);
        if (typeof onSuccess === 'function') {
          onSuccess(auth);
        }
      } else {
        setError(data.message || 'Login failed. Check your username and PIN.');
      }
    } catch (err) {
      setError('Unable to connect. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      {!compact && (
        <>
          <img
            src="/images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '50px', marginBottom: '30px', display: 'block', margin: '0 auto 30px' }}
          />
          <h2 style={{
            color: '#8b1538',
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textAlign: 'center'
          }}>
            Staff Login
          </h2>
          <p style={{
            color: '#666',
            fontSize: '13px',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            Enter your Turbo username and PIN
          </p>
        </>
      )}

      <form onSubmit={handleLogin}>
        {/* Username */}
        <div style={{ marginBottom: '12px', textAlign: 'left' }}>
          <label style={{
            fontSize: '10px',
            color: '#888',
            fontWeight: '700',
            letterSpacing: '1px',
            display: 'block',
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            USERNAME
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value.toUpperCase())}
            placeholder="e.g., HRH1396"
            autoFocus
            autoComplete="username"
            maxLength={20}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '16px',
              textAlign: 'center',
              letterSpacing: '3px',
              fontWeight: '700',
              textTransform: 'uppercase',
              border: '2px solid #9b59b6',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
          <label style={{
            fontSize: '10px',
            color: '#888',
            fontWeight: '700',
            letterSpacing: '1px',
            display: 'block',
            marginBottom: '5px',
            textTransform: 'uppercase'
          }}>
            PIN (last 5 digits of Employee ID)
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              if (digits.length <= 5) setPin(digits);
            }}
            placeholder="•••••"
            autoComplete="current-password"
            inputMode="numeric"
            maxLength={5}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              border: '2px solid #9b59b6',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <p style={{
            color: '#e74c3c',
            fontSize: '13px',
            marginBottom: '15px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !userName.trim() || pin.length < 5}
          style={{
            width: '100%',
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '1px',
            cursor: isSubmitting || !userName.trim() || pin.length < 5 ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !userName.trim() || pin.length < 5 ? 0.6 : 1,
            textTransform: 'uppercase'
          }}
        >
          {isSubmitting ? 'Verifying...' : 'Log In'}
        </button>
      </form>

      <p style={{
        fontSize: '11px',
        color: '#aaa',
        marginTop: '15px',
        textAlign: 'center'
      }}>
        Your PIN is the last 5 digits of your Employee ID (on your paystub)
      </p>
    </div>
  );
}
