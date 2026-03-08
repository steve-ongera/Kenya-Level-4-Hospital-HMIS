/**
 * pages/admin/AdminDashboard.jsx
 */

import { useState, useEffect, useCallback } from 'react';
import {
  usersAPI, patientsAPI, specialistsAPI, tariffsAPI,
  invoicesAPI, drugsAPI, dashboardAPI
} from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, Loading,
  toast, formatDate, formatDateTime, Field, SectionTitle, DetailRow,
  timeAgo, formatKES, ConfirmDialog, Pagination
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function AdminDashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), invoicesAPI.dailySummary()])
      .then(([s, d]) => { setStats(s.data); setDaily(d.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">System overview and management</p></div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-people-fill"           iconBg="#E8F5F3" iconColor="var(--color-primary)" value={stats?.today_visits}      label="Today's Visits" />
        <StatCard icon="bi-person-lines-fill"      iconBg="#E3F2FD" iconColor="#1565C0"             value={stats?.total_patients}    label="Total Patients" />
        <StatCard icon="bi-cash-coin"             iconBg="#FFF8E1" iconColor="var(--color-accent)"  value={formatKES(daily?.total_collected)} label="Today Revenue" />
        <StatCard icon="bi-receipt"               iconBg="#E8F5F3" iconColor="var(--color-primary)" value={daily?.invoice_count}     label="Invoices Today" />
        <StatCard icon="bi-hourglass-split"       iconBg="#FFF8E1" iconColor="var(--color-warning)" value={daily?.pending_count}     label="Pending Invoices" subColor="var(--color-warning)" />
        <StatCard icon="bi-exclamation-triangle"  iconBg="#FDEEEE" iconColor="var(--color-danger)"  value={stats?.low_stock_drugs}   label="Low Stock Drugs"  subColor="var(--color-danger)" />
        <StatCard icon="bi-eyedropper"            iconBg="#E0F7FA" iconColor="#006064"              value={stats?.pending_lab}       label="Pending Labs" />
        <StatCard icon="bi-capsule"               iconBg="#FFEBEE" iconColor="#BF360C"              value={stats?.pending_pharmacy}  label="Pending Pharmacy" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Quick Links</h3></div>
          {[
            { page: 'users',        icon: 'bi-people-fill',  label: 'User Management',   color: '#1565C0' },
            { page: 'specialists',  icon: 'bi-award-fill',   label: 'Specialists',        color: '#4A148C' },
            { page: 'tariffs',      icon: 'bi-tags-fill',    label: 'Service Tariffs',    color: '#006064' },
            { page: 'drugs_admin',  icon: 'bi-capsule',      label: 'Drug Inventory',     color: '#BF360C' },
            { page: 'invoices',     icon: 'bi-receipt',      label: 'All Invoices',       color: '#0A6B5E' },
            { page: 'billing_report', icon: 'bi-bar-chart-fill', label: 'Billing Report', color: '#D48C10' },
          ].map(item => (
            <div key={item.page} className="queue-item" onClick={() => onNavigate(item.page)} style={{ cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${item.icon}`} style={{ color: item.color }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{item.label}</span>
              <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '0.8rem' }} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Today's Summary</h3></div>
          <DetailRow label="Total Visits"      value={stats?.today_visits} />
          <DetailRow label="New Patients"      value={stats?.new_patients_today} />
          <DetailRow label="Discharged"        value={stats?.discharged_today} />
          <DetailRow label="In Consultation"   value={stats?.in_consultation} />
          <DetailRow label="Waiting Queue"     value={stats?.waiting_queue} />
          <DetailRow label="Revenue Collected" value={formatKES(daily?.total_collected)} />
          <DetailRow label="Pending Payment"   value={daily?.pending_count} />
        </div>
      </div>
    </div>
  );
}

// ── User Management ───────────────────────────────────────────────────────────
const BLANK_USER = { username: '', first_name: '', last_name: '', email: '', role: 'receptionist', phone: '', employee_id: '', department: '', specialization: '', license_number: '', password: '', password2: '' };

function UsersPage({ onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ ...BLANK_USER });
  const [errors, setErrors] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    usersAPI.list({ search, role: roleFilter || undefined })
      .then(r => setUsers(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); if (errors[k]) setErrors(er => { const n = {...er}; delete n[k]; return n; }); };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role, phone: u.phone || '', employee_id: u.employee_id || '', department: u.department || '', specialization: u.specialization || '', license_number: u.license_number || '', password: '', password2: '' });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) { delete payload.password; delete payload.password2; }
      if (editUser) { await usersAPI.update(editUser.id, payload); toast.success('User updated'); }
      else          { await usersAPI.create(payload);               toast.success('User created'); }
      setShowForm(false); setEditUser(null); load();
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') setErrors(d);
      else toast.error('Failed to save user');
    }
  };

  const handleDelete = async () => {
    try { await usersAPI.delete(confirmDelete.id); toast.success('User deleted'); setConfirmDelete(null); load(); }
    catch { toast.error('Cannot delete this user'); }
  };

  const ROLE_COLORS = { receptionist: '#0A6B5E', nurse: '#1565C0', doctor: '#4A148C', pharmacist: '#BF360C', lab: '#006064', radiology: '#4E342E', admin: '#1B5E20' };

  const cols = [
    { label: 'Employee ID', render: r => <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem' }}>{r.employee_id || '—'}</span> },
    { label: 'Name',        render: r => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
    { label: 'Username',    key: 'username' },
    { label: 'Role',        render: r => <span className="badge" style={{ background: ROLE_COLORS[r.role] + '18', color: ROLE_COLORS[r.role], borderColor: ROLE_COLORS[r.role] + '40' }}>{r.role}</span> },
    { label: 'Department',  key: 'department' },
    { label: 'Phone',       key: 'phone' },
    { label: 'Status',      render: r => <span className={`badge ${r.is_active ? 'badge-success' : 'badge-muted'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> },
    { label: '',            render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" /></button>
        <button className="btn btn-ghost btn-icon-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(r)}><i className="bi bi-trash" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">User Management</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => { setEditUser(null); setForm({ ...BLANK_USER }); setErrors({}); setShowForm(true); }}>
          <i className="bi bi-person-plus-fill" /> Add User
        </button>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search name, username, employee ID…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 170 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {['receptionist','nurse','doctor','pharmacist','lab','radiology','admin'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={users} loading={loading} emptyIcon="bi-person-x" emptyText="No users found" />
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editUser ? `Edit: ${editUser.full_name}` : 'Add New User'} size="lg" icon="bi-person-fill"
        footer={<><button className="btn btn-outline-muted btn-sm" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" form="userForm" type="submit"><i className="bi bi-check2" /> {editUser ? 'Update' : 'Create User'}</button></>}>
        <form id="userForm" onSubmit={handleSave}>
          <SectionTitle icon="bi-person-badge">Account</SectionTitle>
          <div className="form-row-3">
            <Field label="Username" required error={errors.username}><input className={`form-control ${errors.username ? 'is-invalid' : ''}`} value={form.username} onChange={set('username')} required /></Field>
            <Field label="Employee ID" error={errors.employee_id}><input className="form-control" value={form.employee_id} onChange={set('employee_id')} /></Field>
            <Field label="Role" required>
              <select className="form-control" value={form.role} onChange={set('role')}>
                {['receptionist','nurse','doctor','pharmacist','lab','radiology','admin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-row-3">
            <Field label="First Name" required><input className="form-control" value={form.first_name} onChange={set('first_name')} required /></Field>
            <Field label="Last Name"  required><input className="form-control" value={form.last_name}  onChange={set('last_name')} required /></Field>
            <Field label="Email"><input type="email" className="form-control" value={form.email} onChange={set('email')} /></Field>
          </div>
          <div className="form-row-3">
            <Field label="Phone"><input className="form-control" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Department"><input className="form-control" value={form.department} onChange={set('department')} /></Field>
            <Field label="Specialization" hint="For doctors"><input className="form-control" value={form.specialization} onChange={set('specialization')} /></Field>
          </div>
          <Field label="License Number"><input className="form-control" value={form.license_number} onChange={set('license_number')} /></Field>
          <SectionTitle icon="bi-lock-fill">Password {editUser ? '(leave blank to keep)' : ''}</SectionTitle>
          <div className="form-row-2">
            <Field label="Password" required={!editUser} error={errors.password}><input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={form.password} onChange={set('password')} required={!editUser} /></Field>
            <Field label="Confirm Password" error={errors.password2}><input type="password" className="form-control" value={form.password2} onChange={set('password2')} /></Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!confirmDelete} danger title="Delete User" message={`Delete user ${confirmDelete?.full_name}? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ── Specialists ───────────────────────────────────────────────────────────────
function SpecialistsPage({ onNavigate }) {
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSpec, setEditSpec] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', consultation_fee: '', description: '', is_active: true });

  const load = () => {
    setLoading(true);
    specialistsAPI.list()
      .then(r => setSpecialists(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openEdit = (s) => { setEditSpec(s); setForm({ name: s.name, code: s.code, consultation_fee: s.consultation_fee, description: s.description, is_active: s.is_active }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editSpec) { await specialistsAPI.update(editSpec.id, form); toast.success('Specialist updated'); }
      else          { await specialistsAPI.create(form);               toast.success('Specialist added'); }
      setShowForm(false); setEditSpec(null); load();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    try { await specialistsAPI.delete(confirmDelete.id); toast.success('Deleted'); setConfirmDelete(null); load(); }
    catch { toast.error('Cannot delete — may be in use'); }
  };

  const cols = [
    { label: 'Code',  render: r => <span style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 700 }}>{r.code}</span> },
    { label: 'Name',  render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { label: 'Consultation Fee', render: r => formatKES(r.consultation_fee) },
    { label: 'Description', render: r => r.description || '—' },
    { label: 'Status', render: r => <span className={`badge ${r.is_active ? 'badge-success' : 'badge-muted'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> },
    { label: '', render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" onClick={() => openEdit(r)}><i className="bi bi-pencil" /></button>
        <button className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(r)}><i className="bi bi-trash" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Specialists / Clinics</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => { setEditSpec(null); setForm({ name: '', code: '', consultation_fee: '', description: '', is_active: true }); setShowForm(true); }}><i className="bi bi-plus" /> Add Specialist</button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={specialists} loading={loading} emptyIcon="bi-award" />
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editSpec ? 'Edit Specialist' : 'Add Specialist'} size="sm" icon="bi-award-fill"
        footer={<><button className="btn btn-outline-muted btn-sm" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" form="specForm" type="submit"><i className="bi bi-check2" /> Save</button></>}>
        <form id="specForm" onSubmit={handleSave}>
          <div className="form-row-2"><Field label="Name" required><input className="form-control" value={form.name} onChange={set('name')} required /></Field><Field label="Code" required><input className="form-control" value={form.code} onChange={set('code')} required /></Field></div>
          <Field label="Consultation Fee (KES)" required><input type="number" className="form-control" value={form.consultation_fee} onChange={set('consultation_fee')} step="0.01" required /></Field>
          <Field label="Description"><textarea className="form-control" value={form.description} onChange={set('description')} rows={2} /></Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /><span style={{ fontSize: '0.84rem' }}>Active</span></label>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!confirmDelete} danger title="Delete Specialist" message={`Delete ${confirmDelete?.name}?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ── Service Tariffs ───────────────────────────────────────────────────────────
function TariffsPage({ onNavigate }) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTariff, setEditTariff] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', category: 'lab', price: '', sha_covered: false, sha_rate: 0, is_active: true });

  const load = useCallback(() => {
    setLoading(true);
    tariffsAPI.list({ search, category: catFilter || undefined })
      .then(r => setTariffs(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openEdit = (t) => { setEditTariff(t); setForm({ code: t.code, name: t.name, category: t.category, price: t.price, sha_covered: t.sha_covered, sha_rate: t.sha_rate, is_active: t.is_active }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editTariff) { await tariffsAPI.update(editTariff.id, form); toast.success('Tariff updated'); }
      else            { await tariffsAPI.create(form);                 toast.success('Tariff added'); }
      setShowForm(false); setEditTariff(null); load();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    try { await tariffsAPI.delete(confirmDelete.id); toast.success('Deleted'); setConfirmDelete(null); load(); }
    catch { toast.error('Cannot delete — may be in use'); }
  };

  const cols = [
    { label: 'Code',     render: r => <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem' }}>{r.code}</span> },
    { label: 'Name',     render: r => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { label: 'Category', render: r => <span className="badge badge-info">{r.category}</span> },
    { label: 'Price',    render: r => formatKES(r.price) },
    { label: 'SHA',      render: r => r.sha_covered ? <><span className="sha-badge">SHA ✓</span><span style={{ fontSize: '0.75rem', marginLeft: 6 }}>{formatKES(r.sha_rate)}</span></> : '—' },
    { label: 'Status',   render: r => <span className={`badge ${r.is_active ? 'badge-success' : 'badge-muted'}`}>{r.is_active ? 'Active' : 'Inactive'}</span> },
    { label: '',         render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" onClick={() => openEdit(r)}><i className="bi bi-pencil" /></button>
        <button className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(r)}><i className="bi bi-trash" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Service Tariffs</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => { setEditTariff(null); setForm({ code: '', name: '', category: 'lab', price: '', sha_covered: false, sha_rate: 0, is_active: true }); setShowForm(true); }}><i className="bi bi-plus" /> Add Tariff</button>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search code or name…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {['lab','radiology','procedure','pharmacy','other'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={tariffs} loading={loading} emptyIcon="bi-tags" />
      </div>
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editTariff ? 'Edit Tariff' : 'Add Tariff'} size="md" icon="bi-tags-fill"
        footer={<><button className="btn btn-outline-muted btn-sm" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary btn-sm" form="tariffForm" type="submit"><i className="bi bi-check2" /> Save</button></>}>
        <form id="tariffForm" onSubmit={handleSave}>
          <div className="form-row-2"><Field label="Code" required><input className="form-control" value={form.code} onChange={set('code')} required /></Field><Field label="Name" required><input className="form-control" value={form.name} onChange={set('name')} required /></Field></div>
          <div className="form-row-2">
            <Field label="Category">
              <select className="form-control" value={form.category} onChange={set('category')}>
                {['lab','radiology','procedure','pharmacy','other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price (KES)" required><input type="number" className="form-control" value={form.price} onChange={set('price')} step="0.01" required /></Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={form.sha_covered} onChange={set('sha_covered')} /><span style={{ fontSize: '0.84rem' }}>SHA Covered</span></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /><span style={{ fontSize: '0.84rem' }}>Active</span></label>
          </div>
          {form.sha_covered && <Field label="SHA Rate (KES)"><input type="number" className="form-control" value={form.sha_rate} onChange={set('sha_rate')} step="0.01" /></Field>}
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!confirmDelete} danger title="Delete Tariff" message={`Delete "${confirmDelete?.name}"?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ── All Invoices ──────────────────────────────────────────────────────────────
function InvoicesPage({ onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    invoicesAPI.list({ search, status: filter || undefined })
      .then(r => setInvoices(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Invoice No', render: r => <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'var(--color-primary)' }}>{r.invoice_number}</span> },
    { label: 'Patient',    render: r => <div><span style={{ fontWeight: 600 }}>{r.patient_name}</span><div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.patient_number}</div></div> },
    { label: 'Total',      render: r => formatKES(r.total_amount) },
    { label: 'Paid',       render: r => <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{formatKES(r.amount_paid)}</span> },
    { label: 'Balance',    render: r => <span style={{ color: Number(r.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }}>{formatKES(r.balance)}</span> },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: 'Date',       render: r => formatDate(r.created_at) },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">All Invoices</h1></div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search invoice, patient…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['paid','partial','pending','waived','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card">
        <DataTable columns={cols} data={invoices} loading={loading} emptyIcon="bi-receipt-cutoff" />
      </div>
    </div>
  );
}

// ── Billing Report ────────────────────────────────────────────────────────────
function BillingReportPage({ onNavigate }) {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoicesAPI.dailySummary()
      .then(r => setDaily(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Billing Report</h1><p className="page-subtitle">Today's financial summary</p></div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-cash-coin"   iconBg="#FFF8E1" iconColor="var(--color-accent)"  value={formatKES(daily?.total_collected)} label="Total Collected" />
        <StatCard icon="bi-receipt"     iconBg="#E8F5F3" iconColor="var(--color-primary)" value={daily?.invoice_count}               label="Total Invoices" />
        <StatCard icon="bi-hourglass"   iconBg="#FFF8E1" iconColor="var(--color-warning)" value={daily?.pending_count}               label="Pending Payment" />
      </div>
      <div className="card">
        <div className="card-header"><h3 className="card-title">Summary for {daily?.date}</h3></div>
        <DetailRow label="Date"              value={daily?.date} />
        <DetailRow label="Total Revenue"     value={formatKES(daily?.total_collected)} />
        <DetailRow label="Total Invoices"    value={daily?.invoice_count} />
        <DetailRow label="Pending Invoices"  value={daily?.pending_count} />
        <DetailRow label="Fully Paid"        value={(daily?.invoice_count || 0) - (daily?.pending_count || 0)} />
      </div>
    </div>
  );
}

// ── Drug Inventory (Admin view) ───────────────────────────────────────────────
function DrugsAdminPage({ onNavigate }) {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    drugsAPI.list({ search })
      .then(r => setDrugs(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Drug',      render: r => <span style={{ fontWeight: 600 }}>{r.name} {r.strength}</span> },
    { label: 'Category',  render: r => <span className="badge badge-muted">{r.category}</span> },
    { label: 'Form',      key: 'formulation' },
    { label: 'Stock',     render: r => <span style={{ fontWeight: 700, color: r.is_low_stock ? 'var(--color-danger)' : 'var(--color-success)' }}>{r.stock_quantity}</span> },
    { label: 'Reorder',   key: 'reorder_level' },
    { label: 'Unit Price',render: r => formatKES(r.unit_price) },
    { label: 'Expiry',    render: r => <span style={{ color: r.is_expired ? 'var(--color-danger)' : 'inherit' }}>{formatDate(r.expiry_date)}</span> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Drug Inventory (Admin)</h1></div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search drugs…" style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={drugs} loading={loading} emptyIcon="bi-capsule" />
      </div>
    </div>
  );
}

// ── Patients List (Admin) ─────────────────────────────────────────────────────
function PatientsListPage({ onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    patientsAPI.list({ search })
      .then(r => setPatients(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Name',       render: r => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
    { label: 'Age/Gender', render: r => `${r.age} · ${r.gender}` },
    { label: 'Phone',      key: 'phone' },
    { label: 'SHA',        render: r => r.sha_verified ? <span className="sha-badge">SHA ✓</span> : '—' },
    { label: 'Visits',     render: r => r.total_visits },
    { label: 'Registered', render: r => formatDate(r.created_at) },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">All Patients</h1></div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patients…" style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={patients} loading={loading} emptyIcon="bi-person-x" />
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ activePage, onNavigate }) {
  const navigate = (page) => onNavigate(page);
  switch (activePage) {
    case 'users':           return <UsersPage         onNavigate={navigate} />;
    case 'specialists':     return <SpecialistsPage   onNavigate={navigate} />;
    case 'tariffs':         return <TariffsPage       onNavigate={navigate} />;
    case 'invoices':        return <InvoicesPage      onNavigate={navigate} />;
    case 'billing_report':  return <BillingReportPage onNavigate={navigate} />;
    case 'drugs_admin':     return <DrugsAdminPage    onNavigate={navigate} />;
    case 'patients_list':   return <PatientsListPage  onNavigate={navigate} />;
    default:                return <AdminDashboardPage onNavigate={navigate} />;
  }
}