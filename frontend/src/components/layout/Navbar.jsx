/**
 * Navbar.jsx  (Top bar)
 * Displays page title, live clock, user info, and notification bell.
 */

import { useState, useEffect } from 'react';

const ROLE_ICONS = {
  receptionist: '👩‍💼',
  nurse:        '👩‍⚕️',
  doctor:       '👨‍⚕️',
  pharmacist:   '💊',
  lab:          '🔬',
  radiology:    '🩻',
  admin:        '🔧',
};

export default function Navbar({ title, user }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <header className="topbar">
      {/* Left – page title */}
      <h1 className="topbar-title">{title}</h1>

      {/* Right – clock + user */}
      <div className="topbar-right">
        {/* SHA / eTIMS status chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="sha-badge">🛡️ SHA</span>
          <span className="etims-badge">🧾 eTIMS</span>
        </div>

        {/* Clock */}
        <div className="topbar-datetime">
          <div className="topbar-date">{dateStr}</div>
          <div className="topbar-time">{timeStr}</div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'var(--color-border)' }} />

        {/* User */}
        <div className="topbar-user">
          <div className="topbar-avatar">
            {ROLE_ICONS[user?.role] || '👤'}
          </div>
          <div>
            <div className="topbar-user-name">{user?.full_name || user?.username}</div>
            <div className="topbar-user-role" style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}