/**
 * pages/admin/AdminDashboard.jsx
 * System admin: stats, user management, all patients, billing report
 */

import { useState, useEffect } from 'react';
import { userService, patientService, billingService, dashboardService } from '../../services/api';
import {
  StatCard, SectionHeader, Card, Button, Badge,
  Input, Select, Modal, Table, Alert, Tabs,
} from '../../components/ui';

// ─── Overview Dashboard ───────────────────────────────────────────────────────
function AdminOverviewPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    dashboardService.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <SectionHeader
        title="System Dashboard"
        sub={new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Today stats */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Today's Activity
        </div>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Visits Today"      value={stats?.today_visits        ?? '…'} icon="📋" color="#0A6B5E"  />
        <StatCard label="New Patients"      value={stats?.new_patients_today  ?? '…'} icon="👤" color="#1565C0"  />
        <StatCard label="In Consultation"   value={stats?.in_consultation     ?? '…'} icon="🩺" color="#4A148C"  />
        <StatCard label="Discharged"        value={stats?.discharged_today    ?? '…'} icon="✅" color="#198754"  />
        <StatCard label="Today's Revenue"   value={`KES ${(stats?.today_revenue ?? 0).toLocaleString()}`} icon="💰" color="#0097A7" sub="Collected" />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Pending Actions
        </div>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Pending Lab"       value={stats?.pending_lab        ?? '…'} icon="🔬" color="#006064"  sub="Awaiting results" />
        <StatCard label="Pending Radiology" value={stats?.pending_radiology  ?? '…'} icon="🩻" color="#4E342E"  sub="Awaiting imaging" />
        <StatCard label="Pending Pharmacy"  value={stats?.pending_pharmacy   ?? '…'} icon="💊" color="#BF360C"  sub="Awaiting dispensing" />
        <StatCard label="Low Stock Drugs"   value={stats?.low_stock_drugs    ?? '…'} icon="⚠️" color="#D48C10"  sub="Needs reorder" />
        <StatCard label="Total Patients"    value={stats?.total_patients     ?? '…'} icon="👥" color="#0A6B5E"  sub="All time" />
      </div>

      {/* System info */}
      <div className="grid-2">
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🏥 System Info</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Hospital',    'Kenya National Hospital'],
              ['Level',       'Level 4'],
              ['MFL Code',    '12345'],
              ['County',      'Nairobi'],
              ['HMIS Version','v2.0.0'],
              ['Django',      '5.x · DRF · PostgreSQL'],
              ['Frontend',    'React 18 · Vite'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🔌 Integrations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'eTIMS (KRA)', status: 'active',  desc: 'Electronic Tax Invoice Management' },
              { name: 'SHA',         status: 'active',  desc: 'Social Health Authority' },
              { name: 'KHIS',        status: 'pending', desc: 'Kenya Health Info System' },
              { name: 'NHIF',        status: 'legacy',  desc: 'Legacy — migrated to SHA' },
            ].map(({ name, status, desc }) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{desc}</div>
                </div>
                <Badge color={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'muted'}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────
function UserManagementPage() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const emptyForm = {
    first_name:'', last_name:'', username:'', email:'',
    role:'receptionist', phone:'', employee_id:'', department:'',
    specialization:'', license_number:'', password:'', password2:'',
  };
  const [form, setForm] = useState(emptyForm);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const load = () => {
    setLoading(true);
    userService.list(filterRole ? { role: filterRole } : {})
      .then(r => { setUsers(r.data.results || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filterRole]);

  const createUser = async () => {
    if (!form.first_name || !form.username || !form.password) {
      setError('First name, username and password are required.'); return;
    }
    if (form.password !== form.password2) {
      setError('Passwords do not match.'); return;
    }
    setSaving(true); setError('');
    try {
      await userService.create(form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    await userService.update(user.id, { is_active: !user.is_active });
    load();
  };

  const ROLES = ['receptionist','nurse','doctor','pharmacist','lab','radiology','admin'];
  const roleColors = { receptionist:'primary', nurse:'info', doctor:'muted', pharmacist:'danger', lab:'success', radiology:'warning', admin:'primary' };

  return (
    <div>
      <SectionHeader
        title="User Management"
        sub="Manage staff accounts and module access"
        action={<Button variant="primary" icon="➕" onClick={() => setShowModal(true)}>Add User</Button>}
      />

      <Card style={{ marginBottom: 14 }}>
        <Select
          label="Filter by Role"
          value={filterRole}
          onChange={setFilterRole}
          options={[{ value:'', label:'All Roles' }, ...ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))]}
          style={{ maxWidth: 260, marginBottom: 0 }}
        />
      </Card>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'full_name',    label: 'Full Name',   render: (v, r) => <strong>{v}</strong> },
            { key: 'username',     label: 'Username',    render: v => <span className="patient-id">{v}</span> },
            { key: 'role',         label: 'Role',        render: v => <Badge color={roleColors[v] || 'muted'}>{v}</Badge> },
            { key: 'department',   label: 'Department',  render: v => v || '—' },
            { key: 'employee_id',  label: 'Employee ID', render: v => v || '—' },
            { key: 'phone',        label: 'Phone',       render: v => v || '—' },
            { key: 'is_active',    label: 'Status',
              render: v => <Badge color={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
          ]}
          data={users}
          actions={row => (
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'success'}
              onClick={() => toggleActive(row)}
            >
              {row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setError(''); setForm(emptyForm); }}
        title="Create New User"
        width={620}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" icon="💾" onClick={createUser} disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </>
        }
      >
        {error && <Alert type="danger">{error}</Alert>}
        <div className="form-row">
          <Input label="First Name" value={form.first_name} onChange={f('first_name')} required />
          <Input label="Last Name"  value={form.last_name}  onChange={f('last_name')}  required />
        </div>
        <div className="form-row">
          <Input label="Username"   value={form.username}   onChange={f('username')}   required />
          <Input label="Email"      type="email" value={form.email} onChange={f('email')} />
        </div>
        <div className="form-row">
          <Select label="Role" value={form.role} onChange={f('role')} required
            options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
          <Input label="Phone" value={form.phone} onChange={f('phone')} />
        </div>
        <div className="form-row">
          <Input label="Employee ID"  value={form.employee_id}  onChange={f('employee_id')} />
          <Input label="Department"   value={form.department}   onChange={f('department')} />
        </div>
        {form.role === 'doctor' && (
          <div className="form-row">
            <Input label="Specialization" value={form.specialization}  onChange={f('specialization')} />
            <Input label="License Number" value={form.license_number}  onChange={f('license_number')} />
          </div>
        )}
        <div className="form-row">
          <Input label="Password"         type="password" value={form.password}  onChange={f('password')}  required />
          <Input label="Confirm Password" type="password" value={form.password2} onChange={f('password2')} required />
        </div>
      </Modal>
    </div>
  );
}

// ─── All Patients ─────────────────────────────────────────────────────────────
function AllPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const load = (q = '') => {
    setLoading(true);
    const call = q ? patientService.search(q) : patientService.list();
    call
      .then(r => { setPatients(r.data.results || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doSearch = () => load(search);

  return (
    <div>
      <SectionHeader title="All Patients" sub="Complete patient registry" />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Input
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Phone, ID, Name, Patient No., SHA No."
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Button variant="primary" icon="🔍" onClick={doSearch}>Search</Button>
          <Button variant="ghost" onClick={() => { setSearch(''); load(); }}>Reset</Button>
        </div>
      </Card>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'patient_number', label: 'Patient No.',  render: v => <span className="patient-id">{v}</span> },
            { key: 'full_name',      label: 'Full Name',    render: v => <strong>{v}</strong> },
            { key: 'gender',         label: 'Gender' },
            { key: 'age',            label: 'Age' },
            { key: 'phone',          label: 'Phone' },
            { key: 'county',         label: 'County',       render: v => v || '—' },
            { key: 'sha_number',     label: 'SHA No.',
              render: v => v ? <Badge color="success">{v}</Badge> : <Badge color="muted">None</Badge> },
            { key: 'total_visits',   label: 'Visits',       render: v => <Badge color="primary">{v}</Badge> },
            { key: 'created_at',     label: 'Registered',
              render: v => v ? new Date(v).toLocaleDateString('en-KE') : '—' },
          ]}
          data={patients}
          actions={row => (
            <Button size="sm" variant="outline" onClick={() => setSelected(row)}>View</Button>
          )}
        />
      </Card>

      {/* Patient detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.full_name || 'Patient Details'}
        width={660}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="patient-id">{selected.patient_number}</span>
              {selected.sha_number && <Badge color="success">SHA: {selected.sha_number}</Badge>}
              {selected.is_minor && <Badge color="warning">Minor</Badge>}
              {selected.allergies && <Badge color="danger">⚠️ Allergies</Badge>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
              {[
                ['Gender',      selected.gender],
                ['Age',         selected.age],
                ['DOB',         selected.date_of_birth],
                ['Blood Group', selected.blood_group],
                ['Phone',       selected.phone],
                ['Alt Phone',   selected.alt_phone || '—'],
                ['ID Type',     selected.id_type],
                ['ID Number',   selected.id_number || '—'],
                ['County',      selected.county || '—'],
                ['Email',       selected.email || '—'],
                ['NOK Name',    selected.nok_name || '—'],
                ['NOK Phone',   selected.nok_phone || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ paddingBottom: 6, borderBottom: '1px solid var(--color-border-light)' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{k}:</span>{' '}
                  <span>{v}</span>
                </div>
              ))}
            </div>
            {selected.allergies && (
              <div style={{ marginTop: 12, padding: 10, background: 'var(--color-danger-bg)', borderRadius: 8, fontSize: 13, border: '1px solid #F5C6CB' }}>
                <strong>⚠️ Allergies:</strong> {selected.allergies}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Billing Report ───────────────────────────────────────────────────────────
function BillingReportPage() {
  const [invoices, setInvoices] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      billingService.invoices.list(filter ? { status: filter } : {}),
      billingService.invoices.dailySummary(),
    ]).then(([inv, sum]) => {
      setInvoices(inv.data.results || inv.data);
      setSummary(sum.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const statusColor = { paid:'success', partial:'warning', pending:'danger', cancelled:'muted', waived:'info' };

  return (
    <div>
      <SectionHeader
        title="Billing Report"
        sub="Revenue and invoice overview"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>}
      />

      {/* Today's summary */}
      {summary && (
        <div className="grid-stats" style={{ marginBottom: 20 }}>
          <StatCard label="Today's Revenue"  value={`KES ${(summary.total_collected || 0).toLocaleString()}`} icon="💰" color="#0A6B5E" />
          <StatCard label="Invoices Today"   value={summary.invoice_count  || 0}  icon="📄" color="#1565C0" />
          <StatCard label="Pending Invoices" value={summary.pending_count  || 0}  icon="⏳" color="#D48C10" sub="Outstanding" />
        </div>
      )}

      <Card style={{ marginBottom: 14 }}>
        <Select
          label="Filter by Status"
          value={filter}
          onChange={setFilter}
          options={[
            { value:'',         label:'All Invoices' },
            { value:'pending',  label:'Pending' },
            { value:'partial',  label:'Partially Paid' },
            { value:'paid',     label:'Paid' },
            { value:'cancelled',label:'Cancelled' },
          ]}
          style={{ maxWidth: 260, marginBottom: 0 }}
        />
      </Card>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'invoice_number', label: 'Invoice No.',
              render: v => <span className="patient-id">{v}</span> },
            { key: 'patient_name',   label: 'Patient' },
            { key: 'visit_number',   label: 'Visit No.',
              render: v => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{v}</span> },
            { key: 'total_amount',   label: 'Total',
              render: v => `KES ${parseFloat(v || 0).toLocaleString()}` },
            { key: 'amount_paid',    label: 'Paid',
              render: v => <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>KES {parseFloat(v || 0).toLocaleString()}</span> },
            { key: 'balance',        label: 'Balance',
              render: v => parseFloat(v) > 0
                ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>KES {parseFloat(v).toLocaleString()}</span>
                : <span style={{ color: 'var(--color-success)' }}>—</span> },
            { key: 'status',         label: 'Status',
              render: v => <Badge color={statusColor[v] || 'muted'}>{v}</Badge> },
            { key: 'created_at',     label: 'Date',
              render: v => v ? new Date(v).toLocaleDateString('en-KE') : '—' },
          ]}
          data={invoices}
        />
      </Card>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ activePage, onNavigate }) {
  switch (activePage) {
    case 'users':    return <UserManagementPage />;
    case 'patients': return <AllPatientsPage />;
    case 'billing':  return <BillingReportPage />;
    default:         return <AdminOverviewPage />;
  }
}