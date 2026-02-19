import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const STORAGE_KEY = 'jl_staff_auth';
const SESSION_HOURS = 12;

/**
 * StaffPinGate v2 - Individual Employee Authentication
 * 
 * Login: user_name (Turbo username, e.g., "HRH1396") + last 5 digits of employee_id
 * Session: 12-hour expiry, stored in localStorage
 * On login: auto-sets store to employee's home_store_id (but doesn't lock it)
 * 
 * Usage:
 *   <StaffPinGate>
 *     <QuoteBuilder />
 *   </StaffPinGate>
 */
export default function StaffPinGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authData, setAuthData] = useState(null);

  // Check if already authenticated on mount (with 12-hour expiry)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Check session expiry
        if (parsed.authenticated_at) {
          const authTime = new Date(parsed.authenticated_at).getTime();
          const now = Date.now();
          const hoursSince = (now - authTime) / (1000 * 60 * 60);
          
          if (hoursSince >= SESSION_HOURS) {
            // Session expired
            localStorage.removeItem(STORAGE_KEY);
            setIsChecking(false);
            return;
          }
        }
        
        // Re-verify the employee is still active
        if (parsed.user_name && parsed.employee_id) {
          reverifySession(parsed);
        } else {
          // Old format auth data (from v1 store PINs) — force re-login
          localStorage.removeItem(STORAGE_KEY);
          setIsChecking(false);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setIsChecking(false);
      }
    } else {
      setIsChecking(false);
    }
  }, []);

  // When authenticated, set the store in localStorage to employee's home store
  useEffect(() => {
    if (isAuthenticated && authData && authData.store_id) {
      localStorage.setItem('jl_tire_store', String(authData.store_id));
    }
  }, [isAuthenticated, authData]);

  // Re-verify stored session (silent check that employee is still active)
  const reverifySession = async (storedAuth) => {
    try {
      const response = await fetch(`${API_BASE}/verify-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_name: storedAuth.user_name,
          employee_id: storedAuth.employee_id
        })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        // Still valid — update auth data with fresh info but keep original timestamp
        const auth = {
          ...storedAuth,
          employee_id: data.employee.employee_id,
          user_name: data.employee.user_name,
          first_name: data.employee.first_name,
          last_name: data.employee.last_name,
          display_name: data.employee.display_name,
          store_id: data.employee.home_store_id,
          user_id: data.employee.user_id,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setAuthData(auth);
        setIsAuthenticated(true);
      } else {
        // Employee deactivated or data mismatch — force re-login
        localStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
        setAuthData(null);
      }
    } catch {
      // Network error on re-verify — allow through with stored data
      // (don't lock people out if the API is briefly unreachable)
      setAuthData(storedAuth);
      setIsAuthenticated(true);
    }

    setIsChecking(false);
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !pin.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/verify-staff-pin`, {
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
          employee_id: data.employee.employee_id,
          user_id: data.employee.user_id,
          user_name: data.employee.user_name,
          first_name: data.employee.first_name,
          last_name: data.employee.last_name,
          display_name: data.employee.display_name,
          store_id: data.employee.home_store_id,
          authenticated_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setAuthData(auth);
        setIsAuthenticated(true);
      } else {
        setError(data.message || 'Login failed. Check your username and PIN.');
      }
    } catch (err) {
      setError('Unable to connect. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAuthData(null);
    setUserName('');
    setPin('');
  };

  // Still checking stored session
  if (isChecking) {
    return (
      <div style={{
        fontFamily: "'Segoe UI', sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Verifying access...</div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login form
  if (!isAuthenticated) {
    return (
      <div style={{
        fontFamily: "'Segoe UI', sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          {/* Logo */}
          <img 
            src="https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/Images/JL_Multicare_Horzblack.png"
            alt="Jiffy Lube Multicare"
            style={{ height: '50px', marginBottom: '30px' }}
          />
          
          {/* Title */}
          <h2 style={{
            color: '#8b1538',
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Staff Login
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '13px',
            marginBottom: '25px'
          }}>
            Enter your Turbo username and PIN
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Username Field */}
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

            {/* PIN Field */}
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
                  // Only allow digits
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
                fontWeight: '500'
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

          {/* Help text */}
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '15px' }}>
            Your PIN is the last 5 digits of your Employee ID (on your paystub)
          </p>

          {/* Back link */}
          <a
            href="#/"
            style={{
              display: 'inline-block',
              marginTop: '15px',
              color: '#888',
              fontSize: '13px',
              textDecoration: 'none'
            }}
          >
            ← Back to Tire Finder
          </a>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return (
    <>
      {children}
      {/* Make logout available globally */}
      {typeof window !== 'undefined' && (window.staffLogout = handleLogout) && null}
    </>
  );
}

// Export helper functions
export const getStaffAuth = () => {
  try {
    const stored = localStorage.getItem('jl_staff_auth');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const getStaffEmployee = () => {
  const auth = getStaffAuth();
  if (!auth) return null;
  return {
    employee_id: auth.employee_id,
    user_id: auth.user_id,
    user_name: auth.user_name,
    first_name: auth.first_name,
    last_name: auth.last_name,
    display_name: auth.display_name,
  };
};

export const getStaffStoreId = () => {
  const auth = getStaffAuth();
  return auth?.store_id || null;
};

export const staffLogout = () => {
  localStorage.removeItem('jl_staff_auth');
  window.location.hash = '#/';
  window.location.reload();
};
