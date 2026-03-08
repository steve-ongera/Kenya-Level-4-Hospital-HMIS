/**
 * App.jsx
 * =======
 * Root component.
 * – Checks localStorage for JWT → renders login or the correct module.
 * – One login page redirects to the right role dashboard.
 * – Sidebar + Navbar wrap every authenticated page.
 */

import { useState, useEffect } from 'react';
import './styles/global.css';

import LoginPage        from './pages/auth/LoginPage';
import Sidebar          from './components/layout/Sidebar';
import Navbar           from './components/layout/Navbar';

// Module dashboards
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import { NurseDashboard }    from './pages/nurse/NurseDashboard';
import { DoctorDashboard }   from './pages/doctor/DoctorDashboard';
import PharmacyDashboard     from './pages/pharmacy/PharmacyDashboard';
import LabDashboard          from './pages/lab/LabDashboard';
import RadiologyDashboard    from './pages/radiology/RadiologyDashboard';
import AdminDashboard        from './pages/admin/AdminDashboard';

// ─── Page titles per section ──────────────────────────────────────────────────
const PAGE_TITLES = {
  // Reception
  dashboard:   'Reception Dashboard',
  search:      'Find Patient',
  register:    'Register New Patient',
  visit:       'Register Visit',
  queue:       'Queue Monitor',
  payment:     'Payments',

  // Nurse
  triage_queue:'Triage Queue',
  triage_form: 'Record Vitals',

  // Doctor
  my_queue:    'My Consultation Queue',
  consultation:'Consultation',
  lab_orders:  'Lab Orders',
  rad_orders:  'Radiology Orders',
  prescriptions:'Prescriptions',

  // Pharmacy
  dispensing:  'Dispensing Queue',
  dispense:    'Dispense Medicine',
  inventory:   'Drug Inventory',

  // Lab
  pending:     'Pending Tests',
  results:     'Enter Results',

  // Radiology
  pending_scans: 'Pending Scans',
  enter_scan_results: 'Enter Scan Results',

  // Admin
  users:       'User Management',
  patients:    'All Patients',
  billing:     'Billing Report',
};

// ─── Default landing page per role ───────────────────────────────────────────
const DEFAULT_PAGE = {
  receptionist: 'dashboard',
  nurse:        'dashboard',
  doctor:       'dashboard',
  pharmacist:   'dashboard',
  lab:          'dashboard',
  radiology:    'dashboard',
  admin:        'dashboard',
};

// ─── Module component map ─────────────────────────────────────────────────────
function ModuleDashboard({ role, activePage, onNavigate }) {
  const props = { activePage, onNavigate };
  switch (role) {
    case 'receptionist': return <ReceptionistDashboard {...props} />;
    case 'nurse':        return <NurseDashboard        {...props} />;
    case 'doctor':       return <DoctorDashboard       {...props} />;
    case 'pharmacist':   return <PharmacyDashboard     {...props} />;
    case 'lab':          return <LabDashboard          {...props} />;
    case 'radiology':    return <RadiologyDashboard    {...props} />;
    case 'admin':        return <AdminDashboard        {...props} />;
    default:
      return (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
          <h2>Module not found</h2>
          <p>Role: <strong>{role}</strong></p>
        </div>
      );
  }
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,       setUser]       = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading,    setLoading]    = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('access_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setActivePage(DEFAULT_PAGE[userData.role] || 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setActivePage('dashboard');
  };

  const handleNavigate = (page) => {
    setActivePage(page);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Loading splash ──
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A2E2A 0%, #0A6B5E 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 52 }}>🏥</div>
        <div style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 18 }}>
          Kenya National Hospital HMIS
        </div>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not authenticated → Login ──
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ── Authenticated → Full layout ──
  const pageTitle = PAGE_TITLES[activePage] || activePage?.replace(/_/g, ' ') || 'Dashboard';

  return (
    <div className="app-layout">
      {/* Fixed sidebar */}
      <Sidebar
        role={user.role}
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userName={user.full_name || user.username}
      />

      {/* Fixed topbar */}
      <Navbar title={pageTitle} user={user} />

      {/* Scrollable content area */}
      <main className="main-content">
        <ModuleDashboard
          role={user.role}
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      </main>
    </div>
  );
}