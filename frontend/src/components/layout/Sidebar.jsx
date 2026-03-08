/**
 * components/layout/Sidebar.jsx
 * ==============================
 * Collapsible / drawable sidebar.
 * – Desktop: icon-only collapse mode
 * – Mobile: full slide-over drawer
 */

import { useState } from 'react';

// ── Nav config per role ───────────────────────────────────────────────────────
const NAV = {
  receptionist: {
    color:    '#0A6B5E',
    bg:       'rgba(10,107,94,0.18)',
    label:    'Reception',
    icon:     '🏥',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',      icon: 'bi-grid-1x2-fill',   label: 'Dashboard' },
          { page: 'queue',          icon: 'bi-people-fill',      label: 'Queue Monitor' },
        ],
      },
      {
        title: 'Patients',
        items: [
          { page: 'search',         icon: 'bi-search',           label: 'Find Patient' },
          { page: 'register',       icon: 'bi-person-plus-fill', label: 'Register Patient' },
          { page: 'patients_list',  icon: 'bi-person-lines-fill',label: 'All Patients' },
        ],
      },
      {
        title: 'Visits & Billing',
        items: [
          { page: 'new_visit',      icon: 'bi-clipboard-plus',   label: 'New Visit' },
          { page: 'visits_today',   icon: 'bi-calendar-day',     label: "Today's Visits" },
          { page: 'invoices',       icon: 'bi-receipt',          label: 'Invoices' },
          { page: 'payments',       icon: 'bi-cash-coin',        label: 'Payments' },
        ],
      },
    ],
  },

  nurse: {
    color:    '#1565C0',
    bg:       'rgba(21,101,192,0.18)',
    label:    'Nursing',
    icon:     '🩺',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',      icon: 'bi-grid-1x2-fill',   label: 'Dashboard' },
        ],
      },
      {
        title: 'Triage',
        items: [
          { page: 'triage_queue',   icon: 'bi-list-ol',          label: 'Triage Queue', badge: true },
          { page: 'triage_list',    icon: 'bi-clipboard2-pulse',  label: 'All Triage Records' },
          { page: 'triage_form',    icon: 'bi-plus-square-fill', label: 'Record Vitals' },
        ],
      },
      {
        title: 'Patients',
        items: [
          { page: 'patients_list',  icon: 'bi-person-lines-fill', label: 'Patients' },
          { page: 'search',         icon: 'bi-search',            label: 'Find Patient' },
        ],
      },
    ],
  },

  doctor: {
    color:    '#4A148C',
    bg:       'rgba(74,20,140,0.18)',
    label:    'Doctor',
    icon:     '👨‍⚕️',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',        icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
          { page: 'my_queue',         icon: 'bi-people-fill',       label: 'My Queue', badge: true },
        ],
      },
      {
        title: 'Consultations',
        items: [
          { page: 'consultations',    icon: 'bi-chat-square-text-fill', label: 'All Consultations' },
          { page: 'new_consultation', icon: 'bi-plus-square-fill',       label: 'New Consultation' },
        ],
      },
      {
        title: 'Orders',
        items: [
          { page: 'lab_orders',       icon: 'bi-eyedropper',        label: 'Lab Orders' },
          { page: 'rad_orders',       icon: 'bi-radioactive',       label: 'Radiology Orders' },
          { page: 'prescriptions',    icon: 'bi-capsule',           label: 'Prescriptions' },
        ],
      },
      {
        title: 'Reference',
        items: [
          { page: 'patients_list',    icon: 'bi-person-lines-fill', label: 'Patients' },
          { page: 'visits_today',     icon: 'bi-calendar-day',      label: "Today's Visits" },
        ],
      },
    ],
  },

  pharmacist: {
    color:    '#BF360C',
    bg:       'rgba(191,54,12,0.18)',
    label:    'Pharmacy',
    icon:     '💊',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',        icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
        ],
      },
      {
        title: 'Dispensing',
        items: [
          { page: 'dispensing_queue', icon: 'bi-list-ul',           label: 'Dispensing Queue', badge: true },
          { page: 'prescriptions',    icon: 'bi-capsule',           label: 'All Prescriptions' },
        ],
      },
      {
        title: 'Inventory',
        items: [
          { page: 'inventory',        icon: 'bi-box-seam-fill',     label: 'Drug Inventory' },
          { page: 'low_stock',        icon: 'bi-exclamation-triangle-fill', label: 'Low Stock' },
          { page: 'expiring',         icon: 'bi-calendar-x-fill',   label: 'Expiring Soon' },
        ],
      },
    ],
  },

  lab: {
    color:    '#006064',
    bg:       'rgba(0,96,100,0.18)',
    label:    'Laboratory',
    icon:     '🔬',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',        icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
        ],
      },
      {
        title: 'Lab Work',
        items: [
          { page: 'pending_tests',    icon: 'bi-clock-fill',        label: 'Pending Tests', badge: true },
          { page: 'lab_orders',       icon: 'bi-clipboard2-data-fill', label: 'All Lab Orders' },
          { page: 'lab_results',      icon: 'bi-file-earmark-check-fill', label: 'All Results' },
          { page: 'enter_results',    icon: 'bi-pencil-square',    label: 'Enter Results' },
        ],
      },
      {
        title: 'Reference',
        items: [
          { page: 'patients_list',    icon: 'bi-person-lines-fill', label: 'Patients' },
        ],
      },
    ],
  },

  radiology: {
    color:    '#4E342E',
    bg:       'rgba(78,52,46,0.18)',
    label:    'Radiology',
    icon:     '🩻',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',         icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
        ],
      },
      {
        title: 'Radiology',
        items: [
          { page: 'pending_scans',     icon: 'bi-clock-fill',        label: 'Pending Scans', badge: true },
          { page: 'radiology_orders',  icon: 'bi-clipboard2-data-fill', label: 'All Orders' },
          { page: 'radiology_results', icon: 'bi-file-earmark-check-fill', label: 'All Results' },
          { page: 'enter_scan_results',icon: 'bi-pencil-square',    label: 'Enter Results' },
        ],
      },
      {
        title: 'Reference',
        items: [
          { page: 'patients_list',     icon: 'bi-person-lines-fill', label: 'Patients' },
        ],
      },
    ],
  },

  admin: {
    color:    '#1B5E20',
    bg:       'rgba(27,94,32,0.18)',
    label:    'Admin',
    icon:     '⚙️',
    sections: [
      {
        title: 'Main',
        items: [
          { page: 'dashboard',         icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
        ],
      },
      {
        title: 'People',
        items: [
          { page: 'users',             icon: 'bi-people-fill',       label: 'User Management' },
          { page: 'patients_list',     icon: 'bi-person-lines-fill', label: 'All Patients' },
        ],
      },
      {
        title: 'Clinical Config',
        items: [
          { page: 'specialists',       icon: 'bi-award-fill',        label: 'Specialists' },
          { page: 'tariffs',           icon: 'bi-tags-fill',         label: 'Service Tariffs' },
          { page: 'drugs_admin',       icon: 'bi-capsule',           label: 'Drug Inventory' },
        ],
      },
      {
        title: 'Billing & Reports',
        items: [
          { page: 'invoices',          icon: 'bi-receipt',           label: 'All Invoices' },
          { page: 'payments',          icon: 'bi-cash-coin',         label: 'Payments' },
          { page: 'billing_report',    icon: 'bi-bar-chart-fill',    label: 'Billing Report' },
          { page: 'visits_report',     icon: 'bi-graph-up',          label: 'Visits Report' },
        ],
      },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Sidebar({ role, activePage, onNavigate, onLogout, userName, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const config = NAV[role] || NAV.admin;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}

      <nav className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo" style={{ position: 'relative' }}>
          <div className="sidebar-logo-row">
            <div className="sidebar-logo-icon">{config.icon}</div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <div className="sidebar-logo-title">Kenya National Hospital</div>
                <div className="sidebar-logo-sub">HMIS v2.0</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="sidebar-module-badge" style={{ background: config.bg, color: config.color }}>
              {config.label} Module
            </div>
          )}

          {/* Collapse toggle button */}
          <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
            <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} />
          </button>
        </div>

        {/* Nav sections */}
        <div className="sidebar-nav">
          {config.sections.map((section) => (
            <div key={section.title}>
              {!collapsed && <div className="sidebar-section-title">{section.title}</div>}
              {section.items.map((item) => (
                <button
                  key={item.page}
                  className={`sidebar-nav-item ${activePage === item.page ? 'active' : ''}`}
                  onClick={() => { onNavigate(item.page); onCloseMobile?.(); }}
                  title={collapsed ? item.label : undefined}
                >
                  <i className={`bi ${item.icon} sidebar-nav-icon`} />
                  {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
                  {!collapsed && item.badge && <span className="sidebar-badge-dot" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">
                <i className="bi bi-person-circle" style={{ color: '#fff' }} />
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{userName}</div>
                <div className="sidebar-user-dept">{config.label}</div>
              </div>
            </div>
          )}
          <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">
            <i className="bi bi-box-arrow-left" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </nav>
    </>
  );
}