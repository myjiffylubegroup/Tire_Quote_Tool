import React, { useState, useEffect } from 'react';
import StaffLoginForm from './StaffLoginForm';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const STORAGE_KEY = 'jl_staff_auth';
const SESSION_HOURS = 12;

/**
 * StaffPinGate v2 — Individual Employee Authentication
 *
 * Login: user_name (Turbo username, e.g., "HRH1396") + last 5 digits of employee_id
 * Session: 12-hour expiry, stored in localStorage
 * On login: auto-sets store to employee's home_store_id (but doesn't lock it)
 *
 * v2.1 (May 2026): refactored to use shared StaffLoginForm component so the
 * same form is used here, in StaffLoginModal, and anywhere else login is needed.
 * External API and behavior are unchanged from v2.
 *
 * Usage:
 *   <StaffPinGate>
 *     <QuoteBuilder />
 *   </StaffPinGate>
 */
export default function StaffPinGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
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
        const auth = {
          ...storedAuth,
          employee_id:  data.employee.employee_id,
          user_name:    data.employee.user_name,
          first_name:   data.employee.first_name,
          last_name:    data.employee.last_name,
          display_name: data.employee.display_name,
          store_id:     data.employee.home_store_id,
          user_id:      data.employee.user_id,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setAuthData(auth);
        setIsAuthenticated(true);
      } else {
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

  // Called by StaffLoginForm after successful login
  const handleLoginSuccess = (auth) => {
    setAuthData(auth);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAuthData(null);
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

  // Not authenticated - show login form (full-page layout)
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
          <StaffLoginForm onSuccess={handleLoginSuccess} />

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
      {/* Make logout available globally (preserves prior behavior) */}
      {typeof window !== 'undefined' && (window.staffLogout = handleLogout) && null}
    </>
  );
}

// Export helper functions (unchanged from v2)
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
    employee_id:  auth.employee_id,
    user_id:      auth.user_id,
    user_name:    auth.user_name,
    first_name:   auth.first_name,
    last_name:    auth.last_name,
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
