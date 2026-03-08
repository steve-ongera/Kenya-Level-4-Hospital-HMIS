/**
 * components/ui/index.jsx
 * =======================
 * Shared UI primitives:  Badge, Button, Card, Input, Select,
 * Textarea, Modal, Table, Tabs, StatCard, SectionHeader,
 * Alert, Spinner, VitalBox
 */

import { useState } from 'react';

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ color = 'primary', children }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, style = {}, icon, type = 'button', fullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size}`}
      style={{ width: fullWidth ? '100%' : undefined, ...style }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '', onClick }) {
  return (
    <div
      className={`card ${className}`}
      style={{ cursor: onClick ? 'pointer' : undefined, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'var(--color-primary)', sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-icon" style={{ background: color + '22' }}>
        {icon}
      </div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub" style={{ color }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({
  label, value, onChange, placeholder, type = 'text',
  required = false, disabled = false, style = {}, hint,
}) {
  return (
    <div className="form-group" style={style}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="form-control"
      />
      {hint && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────
export function Select({
  label, value, onChange, options = [], required = false,
  disabled = false, placeholder = '-- Select --', style = {},
}) {
  return (
    <div className="form-group" style={style}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="form-control"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 3, required = false, style = {} }) {
  return (
    <div className="form-group" style={style}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="form-control"
      />
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function Table({ columns, data, actions, loading }) {
  if (loading) return <div className="loading-overlay"><div className="spinner" /> Loading…</div>;
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th style={{ textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="table-empty">
                No records found
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '–'}
                  </td>
                ))}
                {actions && <td style={{ textAlign: 'right' }}>{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <Badge color={active === tab.id ? 'primary' : 'muted'}>{tab.count}</Badge>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, sub, action }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const icons = { info: 'ℹ️', warning: '⚠️', danger: '❌', success: '✅' };
  return (
    <div className={`alert alert-${type}`}>
      <span>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      {label}
    </div>
  );
}

// ─── VitalBox ─────────────────────────────────────────────────────────────────
export function VitalBox({ label, value, unit, normal }) {
  const isAbnormal = normal !== undefined && !normal;
  return (
    <div className="vital-box" style={isAbnormal ? { borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' } : {}}>
      <div className="vital-value" style={isAbnormal ? { color: 'var(--color-danger)' } : {}}>
        {value ?? '—'}
      </div>
      {unit && <div className="vital-unit">{unit}</div>}
      <div className="vital-label">{label}</div>
    </div>
  );
}