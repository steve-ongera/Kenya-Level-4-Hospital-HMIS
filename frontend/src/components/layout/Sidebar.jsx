/**
 * Sidebar.jsx
 * Role-aware navigation sidebar.
 * Each role sees its own menu. DEV items are visible but non-clickable.
 */

import { authService } from '../../services/api';

const MODULE_MENUS = {
  receptionist: [
    { id: 'dashboard',  icon: '🏠', label: 'Dashboard' },
    { id: 'search',     icon: '🔍', label: 'Find Patient' },
    { id: 'register',   icon: '➕', label: 'Register Patient' },
    { id: 'visit',      icon: '📋', label: 'Register Visit' },
    { id: 'queue',      icon: '👥', label: 'Queue Monitor' },
    { id: 'payment',    icon: '💳', label: 'Payments' },
    { id: 'etims',      icon: '🧾', label: 'eTIMS', dev: true },
    { id: 'sha',        icon: '🛡️', label: 'SHA Claims', dev: true },
  ],
  nurse: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'triage_queue', icon: '⏳', label: 'Triage Queue' },
    { id: 'triage_form',  icon: '🩺', label: 'Record Vitals' },
    { id: 'inpatient',    icon: '🛏️', label: 'Inpatient Ward', dev: true },
    { id: 'medications',  icon: '💊', label: 'Medication Admin', dev: true },
    { id: 'reports',      icon: '📊', label: 'Nursing Reports', dev: true },
  ],
  doctor: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'my_queue',     icon: '👥', label: 'My Queue' },
    { id: 'consultation', icon: '🩺', label: 'Consultation' },
    { id: 'lab_orders',   icon: '🔬', label: 'Lab Orders' },
    { id: 'rad_orders',   icon: '🩻', label: 'Radiology Orders' },
    { id: 'prescriptions',icon: '💊', label: 'Prescriptions' },
    { id: 'history',      icon: '📁', label: 'Patient History', dev: true },
    { id: 'referrals',    icon: '🔄', label: 'Referrals', dev: true },
  ],
  pharmacist: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'dispensing',   icon: '📋', label: 'Dispensing Queue' },
    { id: 'dispense',     icon: '✅', label: 'Dispense Medicine' },
    { id: 'inventory',    icon: '📦', label: 'Drug Inventory' },
    { id: 'stock_entry',  icon: '➕', label: 'Stock Entry', dev: true },
    { id: 'expiry',       icon: '⚠️', label: 'Expiry Alerts', dev: true },
  ],
  lab: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'pending',      icon: '🔬', label: 'Pending Tests' },
    { id: 'results',      icon: '📝', label: 'Enter Results' },
    { id: 'history',      icon: '📋', label: 'Results History', dev: true },
    { id: 'qc',           icon: '✅', label: 'Quality Control', dev: true },
  ],
  radiology: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'pending',      icon: '🩻', label: 'Pending Scans' },
    { id: 'results',      icon: '📝', label: 'Enter Results' },
    { id: 'history',      icon: '📋', label: 'Scan History', dev: true },
  ],
  admin: [
    { id: 'dashboard',    icon: '🏠', label: 'Dashboard' },
    { id: 'users',        icon: '👤', label: 'User Management' },
    { id: 'patients',     icon: '🏥', label: 'All Patients' },
    { id: 'billing',      icon: '💰', label: 'Billing Report' },
    { id: 'inventory',    icon: '📦', label: 'Drug Inventory', dev: true },
    { id: 'sha_admin',    icon: '🛡️', label: 'SHA Management', dev: true },
    { id: 'etims_admin',  icon: '🧾', label: 'eTIMS Config', dev: true },
    { id: 'audit',        icon: '🔐', label: 'Audit Log', dev: true },
    { id: 'settings',     icon: '⚙️', label: 'System Settings', dev: true },
  ],
};

const MODULE_LABELS = {
  receptionist: 'Reception',
  nurse:        'Nursing',
  doctor:       'Doctor Console',
  pharmacist:   'Pharmacy',
  lab:          'Laboratory',
  radiology:    'Radiology',
  admin:        'Administration',
};

const MODULE_COLORS = {
  receptionist: '#0A6B5E',
  nurse:        '#1565C0',
  doctor:       '#4A148C',
  pharmacist:   '#BF360C',
  lab:          '#006064',
  radiology:    '#4E342E',
  admin:        '#1B5E20',
};

const MODULE_ICONS = {
  receptionist: '👩‍💼',
  nurse:        '👩‍⚕️',
  doctor:       '👨‍⚕️',
  pharmacist:   '💊',
  lab:          '🔬',
  radiology:    '🩻',
  admin:        '🔧',
};

export default function Sidebar({ role, activePage, onNavigate, onLogout, userName }) {
  const menu   = MODULE_MENUS[role] || [];
  const color  = MODULE_COLORS[role] || '#0A6B5E';
  const label  = MODULE_LABELS[role] || role;

  return (
    <aside className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo-icon" style={{ background: color }}>
            🏥
          </div>
          <div>
            <div className="sidebar-logo-title">KNH-L4 HMIS</div>
            <div className="sidebar-logo-sub">v2.0 · Kenya MOH</div>
          </div>
        </div>
        <div
          className="sidebar-module-badge"
          style={{
            background: color + '30',
            border: `1px solid ${color}60`,
            color: '#fff',
          }}
        >
          {MODULE_ICONS[role]} {label}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.dev && onNavigate(item.id)}
            className={`sidebar-nav-item${activePage === item.id ? ' active' : ''}${item.dev ? ' disabled' : ''}`}
            style={activePage === item.id ? { background: color } : {}}
            title={item.dev ? 'Coming soon' : item.label}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.dev && <span className="sidebar-dev-tag">DEV</span>}
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-meta">
          <div style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 2 }}>
            {userName}
          </div>
          <div>eTIMS · SHA · MOH Level 4</div>
          <div>Kenya HMIS © 2025</div>
        </div>
        <button className="sidebar-logout-btn" onClick={onLogout}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}