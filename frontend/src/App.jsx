/**
 * App.jsx
 * =======
 * Root component.
 * – JWT auth with auto-restore from localStorage
 * – Collapsible sidebar (desktop) + drawable (mobile)
 * – Routes every role to the correct dashboard
 */

import { useState, useEffect } from 'react';
import './styles/global.css';

import LoginPage   from './pages/auth/LoginPage';
import Sidebar     from './components/layout/Sidebar';
import Navbar      from './components/layout/Navbar';
import { ToastContainer } from './components/ui/index.jsx';

import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import { NurseDashboard }    from './pages/nurse/NurseDashboard';
import { DoctorDashboard }   from './pages/doctor/DoctorDashboard';
import PharmacyDashboard     from './pages/pharmacy/PharmacyDashboard';
import LabDashboard          from './pages/lab/LabDashboard';
import RadiologyDashboard    from './pages/radiology/RadiologyDashboard';
import AdminDashboard        from './pages/admin/AdminDashboard';

// ── Page titles ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  // Shared
  dashboard:           'Dashboard',
  patients_list:       'All Patients',
  search:              'Find Patient',

  // Reception
  register:            'Register New Patient',
  new_visit:           'Register Visit',
  visits_today:        "Today's Visits",
  queue:               'Queue Monitor',
  invoices:            'Invoices',
  payments:            'Payments',

  // Nurse
  triage_queue:        'Triage Queue',
  triage_list:         'Triage Records',
  triage_form:         'Record Vitals',

  // Doctor
  my_queue:            'My Consultation Queue',
  consultations:       'Consultations',
  new_consultation:    'New Consultation',
  lab_orders:          'Lab Orders',
  rad_orders:          'Radiology Orders',
  prescriptions:       'Prescriptions',

  // Pharmacy
  dispensing_queue:    'Dispensing Queue',
  inventory:           'Drug Inventory',
  low_stock:           'Low Stock Drugs',
  expiring:            'Expiring Soon',

  // Lab
  pending_tests:       'Pending Tests',
  lab_results:         'Lab Results',
  enter_results:       'Enter Lab Result',

  // Radiology
  pending_scans:       'Pending Scans',
  radiology_orders:    'Radiology Orders',
  radiology_results:   'Radiology Results',
  enter_scan_results:  'Enter Scan Result',

  // Admin
  users:               'User Management',
  specialists:         'Specialists',
  tariffs:             'Service Tariffs',
  billing_report:      'Billing Report',
  visits_report:       'Visits Report',
  drugs_admin:         'Drug Inventory (Admin)',
  payments_admin:      'All Payments',
};

// ── Default landing page per role ─────────────────────────────────────────────
const DEFAULT_PAGE = {
  receptionist: 'dashboard',
  nurse:        'dashboard',
  doctor:       'dashboard',
  pharmacist:   'dashboard',
  lab:          'dashboard',
  radiology:    'dashboard',
  admin:        'dashboard',
};

// ── Module dispatcher ─────────────────────────────────────────────────────────
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
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}><i className="bi bi-question-circle" /></div>
          <h2>Unknown Role</h2>
          <p>Role <strong>{role}</strong> has no module assigned.</p>
        </div>
      );
  }
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser]        = useState(null);
  const [activePage,  setActivePage]  = useState('dashboard');
  const [loading,     setLoading]     = useState(true);
  const [collapsed,   setCollapsed]   = useState(false);   // desktop sidebar collapse
  const [mobileOpen,  setMobileOpen]  = useState(false);   // mobile drawer open

  // ── Restore session ──
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('access_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  // ── Close mobile drawer on page change ──
  useEffect(() => { setMobileOpen(false); }, [activePage]);

  // ── Keyboard shortcut: Escape closes mobile drawer ──
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMenuClick = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
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
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!user) return <LoginPage onLogin={handleLogin} />;

  // ── Authenticated layout ──
  const pageTitle = PAGE_TITLES[activePage] || activePage?.replace(/_/g, ' ') || 'Dashboard';

  return (
    <div className="app-layout">
      {/* Bootstrap Icons CDN — injected once */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />

      {/* Sidebar */}
      <Sidebar
        role={user.role}
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userName={user.full_name || user.username}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Topbar */}
      <Navbar
        title={pageTitle}
        user={user}
        collapsed={collapsed}
        onMenuClick={handleMenuClick}
      />

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <ModuleDashboard
          role={user.role}
          activePage={activePage}
          onNavigate={handleNavigate}
        />
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}