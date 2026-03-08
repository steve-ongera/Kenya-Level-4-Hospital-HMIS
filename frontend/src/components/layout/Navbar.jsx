/**
 * components/layout/Navbar.jsx
 * =============================
 * Fixed top bar with live clock, breadcrumb, and mobile menu button.
 */

import { useState, useEffect } from 'react';

export default function Navbar({ title, user, collapsed, onMenuClick }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const roleLabel = {
    receptionist: 'Receptionist',
    nurse:        'Nurse',
    doctor:       'Doctor',
    pharmacist:   'Pharmacist',
    lab:          'Lab Technician',
    radiology:    'Radiographer',
    admin:        'Administrator',
  }[user?.role] || user?.role || '';

  const roleIcon = {
    receptionist: 'bi-person-badge-fill',
    nurse:        'bi-heart-pulse-fill',
    doctor:       'bi-stethoscope',
    pharmacist:   'bi-capsule-pill',
    lab:          'bi-eyedropper',
    radiology:    'bi-radioactive',
    admin:        'bi-shield-lock-fill',
  }[user?.role] || 'bi-person-fill';

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="topbar-left">
        {/* Mobile/desktop menu toggle */}
        <button className="topbar-menu-btn" onClick={onMenuClick} title="Toggle menu">
          <i className="bi bi-list" />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live clock */}
        <div className="topbar-datetime">
          <div className="topbar-date">
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="topbar-time">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* User info */}
        <div className="topbar-user">
          <div className="topbar-avatar">
            <i className={`bi ${roleIcon}`} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div className="topbar-user-name">{user?.full_name || user?.username}</div>
            <div className="topbar-user-role">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  );
}