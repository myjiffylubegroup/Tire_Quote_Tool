import React, { useEffect } from 'react';
import StaffLoginForm from './StaffLoginForm';

/**
 * StaffLoginModal — overlay modal that wraps StaffLoginForm.
 *
 * Used on public pages (TireFinder, MechanicalFinder) to let staff log in
 * without leaving the page they're on.
 *
 * Props:
 *   isOpen   (boolean)  — whether the modal is visible
 *   onClose  (function) — called when user clicks backdrop, X button, or ESC
 *   onSuccess (function, optional) — called after successful login.
 *                                    If not provided, defaults to window.location.reload().
 *                                    Reloading is the simplest way to refresh `isAuthenticated`
 *                                    state across all components without a Context refactor.
 */
export default function StaffLoginModal({ isOpen, onClose, onSuccess }) {
  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Default success behavior: reload the page so all components see the new auth state.
  // Caller can override by passing onSuccess explicitly.
  const handleSuccess = (auth) => {
    if (typeof onSuccess === 'function') {
      onSuccess(auth);
    } else {
      // Slight delay so the user briefly sees the form clear / button hit success state,
      // but mostly so the localStorage write definitely flushes before reload on slow devices.
      setTimeout(() => { window.location.reload(); }, 150);
    }
  };

  return (
    <div
      onClick={(e) => {
        // Click on backdrop (not inside modal) closes
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '40px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '440px',
          width: '100%',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            fontSize: '28px',
            color: '#999',
            cursor: 'pointer',
            lineHeight: '1',
            padding: '4px 10px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#333'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; }}
        >
          ×
        </button>

        <StaffLoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
