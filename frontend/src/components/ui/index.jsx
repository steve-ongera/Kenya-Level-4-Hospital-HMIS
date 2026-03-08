/**
 * components/ui/index.jsx
 * =======================
 * Shared reusable components used across all pages.
 */

import { useState, useEffect, useCallback, useRef, Children, cloneElement, isValidElement } from 'react';

// ── Unique ID helper ──────────────────────────────────────────────────────────
let _uidCounter = 0;
function useUid() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = `field-${++_uidCounter}`;
  return ref.current;
}

// ── Toast Notification System ─────────────────────────────────────────────────
let _addToast = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _addToast = (toast) => {
      const id = Date.now();
      setToasts(prev => [...prev, { ...toast, id }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration || 4000);
    };
    return () => { _addToast = null; };
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          <i className={`bi ${icons[t.type || 'info']} toast-icon`} />
          <div className="toast-body">
            {t.title && <div className="toast-title">{t.title}</div>}
            <div>{t.message}</div>
          </div>
          <button className="toast-close" onClick={() => remove(t.id)}>
            <i className="bi bi-x" />
          </button>
        </div>
      ))}
    </div>
  );
}

export const toast = {
  success: (message, title) => _addToast?.({ type: 'success', message, title }),
  error:   (message, title) => _addToast?.({ type: 'error',   message, title }),
  warning: (message, title) => _addToast?.({ type: 'warning', message, title }),
  info:    (message, title) => _addToast?.({ type: 'info',    message, title }),
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal modal-sm" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className={`bi ${danger ? 'bi-exclamation-triangle text-danger' : 'bi-question-circle'} me-2`} />
            {title || 'Confirm Action'}
          </h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline-muted btn-sm" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={onConfirm}>
            {danger ? <><i className="bi bi-trash" /> Delete</> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading Component ─────────────────────────────────────────────────────────
export function Loading({ message = 'Loading…' }) {
  return (
    <div className="loading-full">
      <div className="spinner" />
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>{message}</span>
    </div>
  );
}

// ── Status Badge Helpers ──────────────────────────────────────────────────────
const STATUS_BADGE = {
  // Visit statuses
  registered:   'badge-muted',
  payment_done: 'badge-info',
  triage_done:  'badge-warning',
  in_consult:   'badge-primary',
  paused:       'badge-warning',
  prescribing:  'badge-info',
  pharmacy:     'badge-info',
  discharged:   'badge-success',
  referred:     'badge-muted',
  admitted:     'badge-danger',
  // Lab/Rad statuses
  pending:      'badge-warning',
  collected:    'badge-info',
  processing:   'badge-info',
  resulted:     'badge-success',
  verified:     'badge-success',
  scheduled:    'badge-info',
  performed:    'badge-success',
  // Prescription
  dispensed:    'badge-success',
  partial:      'badge-warning',
  cancelled:    'badge-danger',
  // Invoice
  paid:         'badge-success',
  draft:        'badge-muted',
  waived:       'badge-muted',
  // Triage priority
  immediate:    'badge-danger',
  urgent:       'badge-warning',
  normal:       'badge-success',
  non_urgent:   'badge-info',
  // Lab interpretation
  normal_lab:   'badge-success',
  abnormal:     'badge-warning',
  critical:     'badge-danger',
  // Consultation
  open:         'badge-primary',
  completed:    'badge-success',
};

export function StatusBadge({ status, label }) {
  const cls = STATUS_BADGE[status] || 'badge-muted';
  const text = label || status?.replace(/_/g, ' ');
  return <span className={`badge ${cls}`}>{text}</span>;
}

// ── Priority Badge ────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const map = {
    immediate: { cls: 'badge-danger',   icon: 'bi-circle-fill', label: 'Immediate' },
    urgent:    { cls: 'badge-warning',  icon: 'bi-circle-fill', label: 'Urgent' },
    normal:    { cls: 'badge-success',  icon: 'bi-circle-fill', label: 'Normal' },
    non_urgent:{ cls: 'badge-info',     icon: 'bi-circle-fill', label: 'Non-Urgent' },
  };
  const p = map[priority] || map.normal;
  return <span className={`badge ${p.cls}`}><i className={`bi ${p.icon}`} style={{ fontSize: '0.55rem' }} />{p.label}</span>;
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, footer, size = 'md', icon }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      // Autofocus first text input / select / textarea when modal opens
      const t = setTimeout(() => {
        if (!bodyRef.current) return;
        const el = bodyRef.current.querySelector(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        el?.focus();
      }, 60); // small delay lets the DOM settle
      return () => { document.removeEventListener('keydown', handleKey); clearTimeout(t); };
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {icon && <i className={`bi ${icon}`} style={{ marginRight: 8, color: 'var(--color-primary)' }} />}
            {title}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" ref={bodyRef}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Data Table ────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, onRowClick, emptyIcon = 'bi-inbox', emptyText = 'No records found' }) {
  if (loading) return <Loading />;
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={col.style}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length}>
              <div className="table-empty">
                <i className={`bi ${emptyIcon}`} style={{ fontSize: '2rem', display: 'block', marginBottom: 8, opacity: 0.3 }} />
                {emptyText}
              </div>
            </td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)} style={onRowClick ? { cursor: 'pointer' } : {}}>
              {columns.map((col, j) => (
                <td key={j}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, iconBg, iconColor, value, label, sub, subColor = 'var(--color-success)' }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-icon" style={{ background: iconBg }}>
        <i className={`bi ${icon}`} style={{ color: iconColor, fontSize: '1.35rem' }} />
      </div>
      <div>
        <div className="stat-card-value">{value ?? '—'}</div>
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub" style={{ color: subColor }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Search Input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, onClear, placeholder = 'Search…', style }) {
  return (
    <div className="search-bar" style={style}>
      <i className="bi bi-search" />
      <input
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear" onClick={onClear}>
          <i className="bi bi-x-circle-fill" />
        </button>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        <i className="bi bi-chevron-left" />
      </button>
      {visible.map((p, i) => {
        const prev = visible[i - 1];
        return (
          <>
            {prev && p - prev > 1 && <span style={{ color: 'var(--color-text-muted)', padding: '0 4px' }}>…</span>}
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
          </>
        );
      })}
      <button className="page-btn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
}

// ── Form Field ────────────────────────────────────────────────────────────────
export function Field({ label, required, error, children, hint }) {
  const uid = useUid();

  // Clone the first child element and inject id={uid} so the label's htmlFor works.
  // This means clicking anywhere on the label row immediately focuses the input.
  const enhancedChildren = Children.map(children, (child, i) => {
    if (i === 0 && isValidElement(child) && !child.props.id) {
      return cloneElement(child, { id: uid });
    }
    return child;
  });

  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={uid} style={{ cursor: 'pointer', userSelect: 'none' }}>
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      {enhancedChildren}
      {hint  && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 3 }}>{hint}</div>}
      {error && <div className="form-error"><i className="bi bi-exclamation-circle" /> {Array.isArray(error) ? error[0] : error}</div>}
    </div>
  );
}

// ── Detail Row ────────────────────────────────────────────────────────────────
export function DetailRow({ label, value, children }) {
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children || value || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</div>
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
export function SectionTitle({ children, icon }) {
  return (
    <div className="form-section-title">
      {icon && <i className={`bi ${icon}`} style={{ marginRight: 6 }} />}
      {children}
    </div>
  );
}

// ── Money Format ──────────────────────────────────────────────────────────────
export function formatKES(amount) {
  return `KES ${Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Date Helpers ──────────────────────────────────────────────────────────────
export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(d);
}
