import React, { useState, useEffect } from 'react';

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const STORAGE_KEY = 'jl_staff_auth';

/**
 * StaffPinGate - Wrapper component that requires PIN authentication
 * 
 * Per-store PINs: Each store has unique PIN, locks user to that store
 * Master PIN: Corporate access to all stores
 * 
 * Usage:
 *   <StaffPinGate>
 *     <QuoteBuilder />
 *   </StaffPinGate>
 */
export default function StaffPinGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authData, setAuthData] = useState(null); // { is_master, store_id }

  // Check if already authenticated on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Re-verify the stored PIN to make sure it's still valid
        verifyPin(parsed.pin, true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setIsChecking(false);
      }
    } else {
      setIsChecking(false);
    }
  }, []);

  // When authenticated, set the store in localStorage if it's a store-specific PIN
  useEffect(() => {
    if (isAuthenticated && authData) {
      if (!authData.is_master && authData.store_id) {
        // Lock to specific store
        localStorage.setItem('jl_tire_store', String(authData.store_id));
      }
      // If master PIN, don't change the store selection - let them pick
    }
  }, [isAuthenticated, authData]);

  const verifyPin = async (pinToVerify, silent = false) => {
    if (!silent) setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/verify-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToVerify })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        // Save auth data
        const auth = {
          pin: pinToVerify,
          is_master: data.is_master,
          store_id: data.store_id,
          authenticated_at: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        setAuthData(auth);
        setIsAuthenticated(true);
      } else {
        if (!silent) {
          setError('Invalid PIN. Please try again.');
          localStorage.removeItem(STORAGE_KEY);
        }
        setIsAuthenticated(false);
        setAuthData(null);
      }
    } catch (err) {
      if (!silent) {
        setError('Unable to verify PIN. Please try again.');
      }
      setIsAuthenticated(false);
      setAuthData(null);
    }

    setIsChecking(false);
    setIsSubmitting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.trim()) {
      verifyPin(pin.trim());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setAuthData(null);
    setPin('');
  };

  // Still checking stored PIN
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

  // Not authenticated - show PIN entry
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
            Staff Access Only
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '25px'
          }}>
            Enter your store PIN to continue
          </p>

          {/* PIN Form */}
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              maxLength={10}
              style={{
                width: '100%',
                padding: '15px 20px',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                border: '2px solid #9b59b6',
                borderRadius: '10px',
                outline: 'none',
                marginBottom: '15px',
                boxSizing: 'border-box'
              }}
            />

            {error && (
              <p style={{
                color: '#e74c3c',
                fontSize: '13px',
                marginBottom: '15px'
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !pin.trim()}
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
                cursor: isSubmitting || !pin.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !pin.trim() ? 0.6 : 1,
                textTransform: 'uppercase'
              }}
            >
              {isSubmitting ? 'Verifying...' : 'Unlock'}
            </button>
          </form>

          {/* Back link */}
          <a
            href="#/"
            style={{
              display: 'inline-block',
              marginTop: '20px',
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
  // Pass auth data to children via context or props if needed
  return (
    <>
      {children}
      {/* Make logout available globally for testing */}
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

export const isStaffMaster = () => {
  const auth = getStaffAuth();
  return auth?.is_master === true;
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
