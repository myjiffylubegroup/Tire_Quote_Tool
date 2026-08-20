import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from './apiClient';

/**
 * FeedbackModal — staff bug / improvement reporting.
 *
 * Opened from the Feedback pill in the Navbar. Posts to the submit-feedback
 * Edge Function, which saves the report to feedback_tickets and mirrors it to
 * Zendesk. Built for speed: store and submitter are pre-filled from the
 * logged-in session and only need changing on a shared phone.
 *
 * Props:
 *   isOpen       (boolean)  — controls visibility
 *   onClose      (function) — called to close the modal
 *   auth         (object)   — logged-in staff (employee_id, display_name,
 *                             user_name, store_id, ...) from localStorage.jl_staff_auth
 *   defaultArea  (string)   — pre-selected "What is this about?" value, derived
 *                             from the current page ('' = no default, "Select one")
 */

const API_BASE = 'https://vzsitlasfekjkvsaukmh.supabase.co/functions/v1';
const API_KEY = 'TIRES2026';
const PURPLE = '#9b59b6';

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

const AREA_OPTIONS = [
  { value: 'tire_finder', label: 'Tire Finder' },
  { value: 'mechanical',  label: 'Mechanical Quoting' },
  { value: 'greets',      label: 'Greets' },
  { value: 'reports',     label: 'Reports' },
  { value: 'other',       label: 'Other' },
];

const TYPE_OPTIONS = [
  { value: 'bug',         label: 'Bug' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'suggestion',  label: 'Suggestion' },
  { value: 'feedback',    label: 'Feedback' },
];

// Reply-to contact, keyed BY EMPLOYEE. There is no roster source for staff
// email/phone (v_employee_emails covers ~55% of active employees via Connecteam
// and is a NULL stub in a franchisee project), so the modal asks and remembers.
// Keyed per employee because this modal has a roster picker on a shared phone:
// one blob per device would pair the selected person's NAME with the previous
// person's EMAIL, which is worse than asking because it looks correct.
const CONTACT_KEY = 'jl_feedback_contacts';   // { [employee_id]: { email, phone } }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readAllContacts() {
  try {
    const raw = localStorage.getItem(CONTACT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

function readContact(empId) {
  if (empId == null || empId === '') return { email: '', phone: '' };
  const entry = readAllContacts()[String(empId)];
  return { email: entry?.email || '', phone: entry?.phone || '' };
}

function saveContact(empId, email, phone) {
  if (empId == null || empId === '') return;
  try {
    const all = readAllContacts();
    all[String(empId)] = { email, phone };
    localStorage.setItem(CONTACT_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota — the report still sends, they just retype next time */
  }
}

export default function FeedbackModal({ isOpen, onClose, auth, defaultArea = '' }) {
  const [area, setArea] = useState(defaultArea || '');
  const [type, setType] = useState('');
  const [storeId, setStoreId] = useState(auth?.store_id ? String(auth.store_id) : '');
  const [employeeId, setEmployeeId] = useState(auth?.employee_id ? String(auth.employee_id) : '');
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }
  const successTimer = useRef(null);

  // Reset the form each time the modal is opened
  useEffect(() => {
    if (!isOpen) return;
    setArea(defaultArea || '');
    setType('');
    setStoreId(auth?.store_id ? String(auth.store_id) : '');
    setEmployeeId(auth?.employee_id ? String(auth.employee_id) : '');
    setMessage('');
    setResult(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Body scroll lock + ESC to close while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Clear any pending auto-close timer on unmount
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  // Load the remembered contact for whoever is currently selected as submitter.
  // Re-runs when the roster pick changes, so switching submitter swaps in that
  // person's saved address rather than leaving the previous one in the box.
  useEffect(() => {
    if (!isOpen) return;
    const c = readContact(employeeId);
    setEmail(c.email);
    setPhone(c.phone);
  }, [isOpen, employeeId]);

  // Load the store roster for the submitter dropdown (re-loads if store changes)
  useEffect(() => {
    if (!isOpen || !storeId) { setRoster([]); return; }
    let cancelled = false;

    const load = async () => {
      setRosterLoading(true);
      try {
        const res = await apiCall(`${API_BASE}/employee-list?store_id=${storeId}&key=${API_KEY}`);
        if (!res) return; // apiCall returns undefined if the session needs re-auth
        const data = await res.json();
        const list = data?.employees || data?.data || [];
        if (cancelled) return;
        setRoster(list);
        // Keep the current pick if still valid; else default to the logged-in
        // employee; else the first person on the roster.
        setEmployeeId((prev) => {
          const ids = list.map((e) => String(e.employee_id));
          if (prev && ids.includes(prev)) return prev;
          if (auth?.employee_id && ids.includes(String(auth.employee_id))) return String(auth.employee_id);
          return list.length ? String(list[0].employee_id) : '';
        });
      } catch {
        if (!cancelled) setRoster([]);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storeId]);

  const emailOk = EMAIL_RE.test(email.trim());
  const canSubmit = !!(area && type && message.trim() && storeId && employeeId && emailOk && !submitting);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    const selected = roster.find((e) => String(e.employee_id) === String(employeeId));
    const submitterName =
      selected?.display_name ||
      (selected ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim() : '') ||
      auth?.display_name ||
      '';
    const submitterUserName = selected?.user_name || auth?.user_name || '';

    try {
      const res = await apiCall(`${API_BASE}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          type,
          message: message.trim(),
          store_id: Number(storeId),
          submitter_employee_id: selected ? Number(selected.employee_id) : (auth?.employee_id ?? null),
          submitter_name: submitterName,
          submitter_user_name: submitterUserName,
          submitter_email: email.trim(),       // required — becomes the Zendesk requester
          submitter_phone: phone.trim() || undefined,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });

      if (!res) { setSubmitting(false); return; } // session needs re-auth; apiCall handles it
      const data = await res.json();

      if (res.ok && data?.success) {
        saveContact(employeeId, email.trim(), phone.trim());
        setResult({ type: 'success', text: 'Thanks — your report was sent. We\u2019ll reply by email.' });
        successTimer.current = setTimeout(() => { onClose(); }, 1600);
      } else {
        setResult({ type: 'error', text: data?.error || 'Could not send. Please try again.' });
        setSubmitting(false);
      }
    } catch {
      setResult({ type: 'error', text: 'Could not connect. Please try again.' });
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ── Shared field styles (match the app's existing inline-style house look) ──
  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#666',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '5px',
  };
  const fieldWrap = { marginBottom: '14px' };
  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#333',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 16px',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: PURPLE,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>
            🛟 Report or Suggest
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {result?.type === 'success' ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontSize: '15px', color: '#333', fontWeight: 600 }}>{result.text}</div>
            </div>
          ) : (
            <>
              {/* Store (auto-selected to the logged-in store) */}
              <div style={fieldWrap}>
                <label style={labelStyle}>Store</label>
                <select style={selectStyle} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                  {STORES.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Submitter (auto-selected to the logged-in person) */}
              <div style={fieldWrap}>
                <label style={labelStyle}>Your name</label>
                <select
                  style={selectStyle}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={rosterLoading}
                >
                  {rosterLoading && <option value="">Loading…</option>}
                  {!rosterLoading && roster.length === 0 && <option value="">No employees found</option>}
                  {roster.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Employee ${emp.employee_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area */}
              <div style={fieldWrap}>
                <label style={labelStyle}>What is this about?</label>
                <select style={selectStyle} value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Select one…</option>
                  {AREA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Nature */}
              <div style={fieldWrap}>
                <label style={labelStyle}>Nature</label>
                <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">Select one…</option>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Details */}
              <div style={fieldWrap}>
                <label style={labelStyle}>Details</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '110px', resize: 'vertical' }}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What happened, or what would make this better?"
                  maxLength={5000}
                />
              </div>

              {/* Reply-to contact. Email is required because it becomes the Zendesk
                  ticket requester — without it an agent's reply goes to the API
                  service account and never reaches the person who filed this. */}
              <div style={fieldWrap}>
                <label style={labelStyle}>Your email *</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  style={{ ...inputStyle, borderColor: email && !emailOk ? '#e57373' : undefined }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                />
                <div style={{ fontSize: '11px', color: email && !emailOk ? '#b71c1c' : '#888', marginTop: '4px' }}>
                  {email && !emailOk
                    ? 'That doesn\u2019t look like an email address.'
                    : 'So we can reply about this report. Saved on this device.'}
                </div>
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Your phone (optional)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  style={inputStyle}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="805-555-0134"
                  maxLength={40}
                />
              </div>

              {result?.type === 'error' && (
                <div style={{
                  backgroundColor: '#fdecea',
                  color: '#b71c1c',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}>
                  {result.text}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    background: 'white',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: canSubmit ? PURPLE : '#cbb6d6',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  {submitting ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
