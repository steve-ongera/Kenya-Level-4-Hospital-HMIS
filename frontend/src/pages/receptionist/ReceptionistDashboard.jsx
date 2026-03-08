/**
 * pages/receptionist/ReceptionistDashboard.jsx
 * =============================================
 * Pages: dashboard | search | register | patients_list | new_visit
 *        visits_today | queue | invoices | payments
 */

import { useState, useEffect, useCallback } from 'react';
import {
  dashboardAPI, patientsAPI, visitsAPI, specialistsAPI,
  invoicesAPI, paymentsAPI
} from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge,
  ConfirmDialog, Loading, toast, formatDate, formatDateTime,
  formatKES, Field, SectionTitle, DetailRow, timeAgo, Pagination
} from '../../components/ui/index.jsx';

// ═══════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════
function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState(null);

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), invoicesAPI.dailySummary()])
      .then(([s, d]) => { setStats(s.data); setDailySummary(d.data); })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reception Dashboard</h1>
          <p className="page-subtitle">Overview of today's hospital activity</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-md" onClick={() => onNavigate('register')}>
            <i className="bi bi-person-plus-fill" /> Register Patient
          </button>
          <button className="btn btn-outline btn-md" onClick={() => onNavigate('new_visit')}>
            <i className="bi bi-clipboard-plus" /> New Visit
          </button>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-people-fill" iconBg="#E8F5F3" iconColor="var(--color-primary)" value={stats?.today_visits} label="Today's Visits" sub={`${stats?.new_patients_today} new patients`} />
        <StatCard icon="bi-hourglass-split" iconBg="#FFF8E1" iconColor="var(--color-warning)" value={stats?.waiting_queue} label="In Queue" sub="Awaiting triage/consult" subColor="var(--color-warning)" />
        <StatCard icon="bi-chat-square-text-fill" iconBg="#EDE7F6" iconColor="#7B1FA2" value={stats?.in_consultation} label="In Consultation" />
        <StatCard icon="bi-check2-circle" iconBg="#E8F5EC" iconColor="var(--color-success)" value={stats?.discharged_today} label="Discharged Today" subColor="var(--color-success)" />
        <StatCard icon="bi-person-lines-fill" iconBg="#E3F2FD" iconColor="#1565C0" value={stats?.total_patients} label="Total Patients" />
        <StatCard icon="bi-cash-coin" iconBg="#FFF8E1" iconColor="var(--color-accent)" value={formatKES(dailySummary?.total_collected)} label="Today's Revenue" sub={`${dailySummary?.invoice_count} invoices`} />
      </div>

      <div className="grid-3">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title"><i className="bi bi-activity" style={{ marginRight: 6 }} />Pending Tasks</h3>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('queue')}>View Queue</button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Pending Lab',      val: stats?.pending_lab,      color: '#006064', bg: '#E0F7FA', icon: 'bi-eyedropper' },
              { label: 'Pending Radiology',val: stats?.pending_radiology, color: '#4E342E', bg: '#FBE9E7', icon: 'bi-radioactive' },
              { label: 'Pending Pharmacy', val: stats?.pending_pharmacy,  color: '#BF360C', bg: '#FBE9E7', icon: 'bi-capsule' },
              { label: 'Low Stock Drugs',  val: stats?.low_stock_drugs,   color: '#DC3545', bg: '#FDEEEE', icon: 'bi-exclamation-triangle-fill' },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: item.bg, borderRadius: 12, padding: '14px 16px' }}>
                <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: '1.3rem' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 6, color: item.color }}>{item.val ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><i className="bi bi-receipt" style={{ marginRight: 6 }} />Billing Today</h3>
          </div>
          {dailySummary ? (
            <div>
              <DetailRow label="Total Collected" value={formatKES(dailySummary.total_collected)} />
              <DetailRow label="Total Invoices"  value={dailySummary.invoice_count} />
              <DetailRow label="Pending Payment" value={dailySummary.pending_count} />
            </div>
          ) : <Loading />}
          <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => onNavigate('invoices')}>
            View All Invoices
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PATIENT SEARCH PAGE
// ═══════════════════════════════════════════════════════════
function PatientSearchPage({ onNavigate, onSelectPatient }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const { data } = await patientsAPI.search(query);
      setResults(data.results || []);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const cols = [
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Full Name',   render: r => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
    { label: 'Age/Gender',  render: r => `${r.age} / ${r.gender}` },
    { label: 'Phone',       render: r => r.phone },
    { label: 'SHA',         render: r => r.sha_verified ? <span className="sha-badge">SHA ✓</span> : <span className="badge badge-muted">Cash</span> },
    { label: 'Visits',      render: r => r.total_visits },
    { label: '',            render: r => (
      <div className="table-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onSelectPatient(r)}>
          <i className="bi bi-eye" /> View
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('new_visit', r)}>
          <i className="bi bi-clipboard-plus" /> Visit
        </button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Find Patient</h1>
          <p className="page-subtitle">Search by name, phone, ID, patient number, SHA number, or guardian phone</p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('register')}>
          <i className="bi bi-person-plus-fill" /> Register New
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={query} onChange={setQuery} onClear={() => { setQuery(''); setResults([]); setSearched(false); }}
            placeholder="Search name, phone, ID number, patient no, SHA, guardian phone…"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-md" onClick={doSearch} disabled={!query.trim() || loading}>
            {loading ? <span className="spinner spinner-sm" /> : <i className="bi bi-search" />} Search
          </button>
        </div>
      </div>

      {searched && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Results ({results.length})</h3>
          </div>
          <DataTable columns={cols} data={results} loading={loading} emptyText="No patients found. Try different search terms." emptyIcon="bi-person-x" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  REGISTER PATIENT PAGE
// ═══════════════════════════════════════════════════════════
const BLANK_PATIENT = {
  first_name:'', middle_name:'', last_name:'', date_of_birth:'', gender:'Male',
  phone:'', alt_phone:'', email:'', id_type:'National ID', id_number:'',
  blood_group:'Unknown', nationality:'Kenyan', occupation:'',
  county:'', sub_county:'', village:'',
  is_minor: false,
  guardian_name:'', guardian_phone:'', guardian_relation:'', guardian_id:'',
  sha_number:'', sha_scheme:'', nhif_number:'',
  allergies:'None', chronic_conditions:'None',
  nok_name:'', nok_phone:'', nok_relation:'',
};

function RegisterPatientPage({ onNavigate, editPatient, onSaved }) {
  const [form, setForm]   = useState(editPatient ? { ...editPatient } : { ...BLANK_PATIENT });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!editPatient;

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(er => { const n = {...er}; delete n[k]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim())  e.last_name  = 'Required';
    if (!form.date_of_birth)     e.date_of_birth = 'Required';
    if (!form.phone.trim())      e.phone = 'Required';
    if (form.is_minor && !form.guardian_name) e.guardian_name = 'Required for minors';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await patientsAPI.update(editPatient.id, form);
        toast.success('Patient updated successfully');
      } else {
        const { data } = await patientsAPI.create(form);
        toast.success(`Patient registered: ${data.patient_number}`);
        onSaved?.(data);
      }
      onNavigate('patients_list');
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') setErrors(d);
      else toast.error('Failed to save patient');
    } finally { setSaving(false); }
  };

  const F = ({ label, name, required: req, type = 'text', options, hint, colspan }) => (
    <Field label={label} required={req} error={errors[name]} hint={hint}>
      {options ? (
        <select className={`form-control ${errors[name] ? 'is-invalid' : ''}`} value={form[name]} onChange={set(name)}>
          {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
          <input type="checkbox" checked={form[name]} onChange={set(name)} style={{ width: 16, height: 16 }} />
          <span style={{ fontSize: '0.84rem' }}>{label}</span>
        </label>
      ) : (
        <input
          type={type} className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
          value={form[name]} onChange={set(name)}
        />
      )}
    </Field>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
          <p className="page-subtitle">{isEdit ? `Editing: ${editPatient.full_name}` : 'Complete all required fields'}</p>
        </div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('patients_list')}>
          <i className="bi bi-arrow-left" /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-person-badge">Personal Information</SectionTitle>
          <div className="form-row-3">
            <F label="First Name" name="first_name" required />
            <F label="Middle Name" name="middle_name" />
            <F label="Last Name" name="last_name" required />
          </div>
          <div className="form-row-3">
            <F label="Date of Birth" name="date_of_birth" required type="date" />
            <F label="Gender" name="gender" required options={['Male','Female','Other']} />
            <F label="Blood Group" name="blood_group" options={['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']} />
          </div>
          <div className="form-row-3">
            <F label="Nationality" name="nationality" />
            <F label="Occupation" name="occupation" />
            <F label="ID Type" name="id_type" options={['National ID','Birth Certificate','Passport','Alien ID']} />
          </div>
          <div className="form-row-2">
            <F label="ID Number" name="id_number" />
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_minor} onChange={set('is_minor')} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Minor (under 18)</span>
              </label>
            </div>
          </div>
        </div>

        {form.is_minor && (
          <div className="card" style={{ marginBottom: 16, borderColor: '#90CAF9' }}>
            <SectionTitle icon="bi-people-fill">Guardian / Parent Information</SectionTitle>
            <div className="form-row-2">
              <F label="Guardian Name" name="guardian_name" required />
              <F label="Relationship" name="guardian_relation" />
            </div>
            <div className="form-row-2">
              <F label="Guardian Phone" name="guardian_phone" />
              <F label="Guardian ID No" name="guardian_id" />
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-telephone-fill">Contact Information</SectionTitle>
          <div className="form-row-3">
            <F label="Primary Phone" name="phone" required />
            <F label="Alternate Phone" name="alt_phone" />
            <F label="Email" name="email" type="email" />
          </div>
          <div className="form-row-3">
            <F label="County" name="county" />
            <F label="Sub-County" name="sub_county" />
            <F label="Village / Estate" name="village" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-shield-plus">Insurance</SectionTitle>
          <div className="form-row-3">
            <F label="SHA Member No." name="sha_number" hint="Social Health Authority number" />
            <F label="SHA Scheme" name="sha_scheme" options={['','Primary Care','Enhanced']} />
            <F label="NHIF No. (legacy)" name="nhif_number" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-heart-pulse-fill">Clinical Background</SectionTitle>
          <div className="form-row-2">
            <Field label="Known Allergies" error={errors.allergies}>
              <textarea className="form-control" value={form.allergies} onChange={set('allergies')} rows={2} placeholder="e.g. Penicillin, None" />
            </Field>
            <Field label="Chronic Conditions" error={errors.chronic_conditions}>
              <textarea className="form-control" value={form.chronic_conditions} onChange={set('chronic_conditions')} rows={2} placeholder="e.g. Hypertension, Diabetes, None" />
            </Field>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <SectionTitle icon="bi-person-heart">Next of Kin</SectionTitle>
          <div className="form-row-3">
            <F label="NOK Name" name="nok_name" />
            <F label="NOK Phone" name="nok_phone" />
            <F label="Relationship" name="nok_relation" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('patients_list')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><i className="bi bi-check2" /> {isEdit ? 'Update Patient' : 'Register Patient'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PATIENTS LIST PAGE
// ═══════════════════════════════════════════════════════════
function PatientsListPage({ onNavigate, onSelectPatient }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, search, ...filter };
      const { data } = await patientsAPI.list(params);
      setPatients(Array.isArray(data) ? data : data.results || []);
      if (data.count) setTotalPages(Math.ceil(data.count / 20));
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try {
      await patientsAPI.delete(confirmDelete.id);
      toast.success('Patient deleted');
      setConfirmDelete(null);
      load();
    } catch { toast.error('Failed to delete patient'); }
  };

  const cols = [
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Name',       render: r => <div><span style={{ fontWeight: 600 }}>{r.full_name}</span>{r.is_minor && <span className="badge badge-info" style={{ marginLeft: 6 }}>Minor</span>}</div> },
    { label: 'Age/Gender', render: r => `${r.age} · ${r.gender}` },
    { label: 'Phone',      render: r => r.phone },
    { label: 'County',     key:    'county' },
    { label: 'SHA',        render: r => r.sha_verified ? <span className="sha-badge">SHA ✓</span> : <span className="badge badge-muted">—</span> },
    { label: 'Visits',     render: r => r.total_visits },
    { label: 'Registered', render: r => formatDate(r.created_at) },
    { label: '',           render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" title="View" onClick={() => onSelectPatient?.(r)}><i className="bi bi-eye" /></button>
        <button className="btn btn-ghost btn-icon-sm" title="Edit" onClick={() => onNavigate('register', r)}><i className="bi bi-pencil" /></button>
        <button className="btn btn-ghost btn-icon-sm" title="New Visit" onClick={() => onNavigate('new_visit', r)}><i className="bi bi-clipboard-plus" /></button>
        <button className="btn btn-ghost btn-icon-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(r)}><i className="bi bi-trash" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">All Patients</h1></div>
        <div className="page-actions">
          <button className="btn btn-primary btn-md" onClick={() => onNavigate('register')}>
            <i className="bi bi-person-plus-fill" /> Register Patient
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patients…" style={{ flex: 1, minWidth: 220 }} />
        <select className="form-control" style={{ width: 140 }} onChange={e => setFilter(f => ({ ...f, gender: e.target.value || undefined }))}>
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select className="form-control" style={{ width: 160 }} onChange={e => setFilter(f => ({ ...f, sha_verified: e.target.value || undefined }))}>
          <option value="">All Insurance</option>
          <option value="true">SHA Insured</option>
          <option value="false">Non-SHA</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>

      <div className="card">
        <DataTable columns={cols} data={patients} loading={loading} emptyIcon="bi-person-x" emptyText="No patients found" />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmDialog isOpen={!!confirmDelete} danger title="Delete Patient"
        message={`Delete ${confirmDelete?.full_name}? This action cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  NEW VISIT PAGE
// ═══════════════════════════════════════════════════════════
function NewVisitPage({ onNavigate, preselectedPatient }) {
  const [form, setForm]   = useState({ patient: preselectedPatient?.id || '', visit_type: 'outpatient', specialist: '', payment_method: 'Cash', sha_auth_code: '', mpesa_ref: '', notes: '' });
  const [patientQuery, setPatientQuery] = useState(preselectedPatient?.full_name || '');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient || null);
  const [specialists, setSpecialists] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { specialistsAPI.list().then(r => setSpecialists(r.data.results || r.data)); }, []);

  const searchPatient = async (q) => {
    setPatientQuery(q);
    if (q.length < 2) { setPatientResults([]); return; }
    const { data } = await patientsAPI.search(q);
    setPatientResults(data.results || []);
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setForm(f => ({ ...f, patient: p.id }));
    setPatientQuery(p.full_name);
    setPatientResults([]);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient) { toast.error('Please select a patient'); return; }
    if (!form.specialist) { toast.error('Please select a specialist'); return; }
    setSaving(true);
    try {
      const { data } = await visitsAPI.create(form);
      toast.success(`Visit created: ${data.visit_number}`);
      onNavigate('visits_today');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create visit');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Register New Visit</h1></div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('visits_today')}><i className="bi bi-arrow-left" /> Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-person-fill">Select Patient</SectionTitle>
          {selectedPatient ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 10, border: '1px solid var(--color-primary-100)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedPatient.full_name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {selectedPatient.patient_number} · {selectedPatient.age} · {selectedPatient.gender}
                </div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedPatient(null); setForm(f => ({...f, patient:''})); setPatientQuery(''); }}>
                Change
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <SearchInput value={patientQuery} onChange={searchPatient} onClear={() => { setPatientQuery(''); setPatientResults([]); }} placeholder="Search patient by name or phone…" />
              {patientResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
                  {patientResults.map(p => (
                    <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4F3'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{p.patient_number} · {p.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-clipboard-fill">Visit Details</SectionTitle>
          <div className="form-row-3">
            <Field label="Visit Type" required>
              <select className="form-control" value={form.visit_type} onChange={set('visit_type')}>
                <option value="outpatient">Outpatient</option>
                <option value="inpatient">Inpatient</option>
                <option value="emergency">Emergency</option>
              </select>
            </Field>
            <Field label="Specialist / Clinic" required>
              <select className="form-control" value={form.specialist} onChange={set('specialist')}>
                <option value="">— Select Specialist —</option>
                {specialists.map(s => <option key={s.id} value={s.id}>{s.name} — KES {s.consultation_fee}</option>)}
              </select>
            </Field>
            <Field label="Payment Method" required>
              <select className="form-control" value={form.payment_method} onChange={set('payment_method')}>
                {['Cash','M-Pesa','SHA','Insurance','Waiver'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          {form.payment_method === 'M-Pesa' && (
            <div className="form-row-2">
              <Field label="M-Pesa Reference"><input className="form-control" value={form.mpesa_ref} onChange={set('mpesa_ref')} placeholder="e.g. QBC1234XYZ" /></Field>
            </div>
          )}
          {form.payment_method === 'SHA' && (
            <div className="form-row-2">
              <Field label="SHA Auth Code"><input className="form-control" value={form.sha_auth_code} onChange={set('sha_auth_code')} /></Field>
            </div>
          )}
          <Field label="Notes">
            <textarea className="form-control" value={form.notes} onChange={set('notes')} rows={2} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('visits_today')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Creating…</> : <><i className="bi bi-check2" /> Register Visit</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TODAY'S VISITS PAGE
// ═══════════════════════════════════════════════════════════
function VisitsTodayPage({ onNavigate }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    visitsAPI.today()
      .then(r => setVisits(r.data))
      .catch(() => toast.error('Failed to load visits'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = visits.filter(v =>
    !search || v.patient_name?.toLowerCase().includes(search.toLowerCase()) || v.visit_number?.includes(search) || v.patient_number?.includes(search)
  );

  const cols = [
    { label: 'Visit No',   render: r => <span className="visit-id">{r.visit_number}</span> },
    { label: 'Patient',    render: r => <div><span style={{ fontWeight: 600 }}>{r.patient_name}</span><div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.patient_number}</div></div> },
    { label: 'Type',       render: r => r.visit_type },
    { label: 'Specialist', render: r => r.specialist_name },
    { label: 'Doctor',     render: r => r.doctor_name || '—' },
    { label: 'Status',     render: r => <StatusBadge status={r.status} label={r.status_display} /> },
    { label: 'Payment',    render: r => r.payment_method },
    { label: 'Check-in',   render: r => timeAgo(r.check_in_time) },
    { label: '',           render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" title="Update Status" onClick={() => toast.info('Select new status from context menu')}><i className="bi bi-pencil-square" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Today's Visits</h1><p className="page-subtitle">{visits.length} visits registered today</p></div>
        <div className="page-actions">
          <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
          <button className="btn btn-primary btn-md" onClick={() => onNavigate('new_visit')}><i className="bi bi-plus" /> New Visit</button>
        </div>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Filter by patient or visit number…" style={{ flex: 1 }} />
      </div>
      <div className="card">
        <DataTable columns={cols} data={filtered} loading={loading} emptyIcon="bi-calendar-x" emptyText="No visits today" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  QUEUE MONITOR
// ═══════════════════════════════════════════════════════════
function QueuePage({ onNavigate }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    visitsAPI.queue()
      .then(r => setQueue(r.data))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const groups = {
    payment_done: queue.filter(v => v.status === 'payment_done'),
    triage_done:  queue.filter(v => v.status === 'triage_done'),
    in_consult:   queue.filter(v => v.status === 'in_consult'),
    paused:       queue.filter(v => v.status === 'paused'),
  };

  const GroupCard = ({ title, visits, color, icon, statusKey }) => (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`bi ${icon}`} style={{ color }} />
          <h3 className="card-title">{title}</h3>
          <span className="badge badge-primary" style={{ marginLeft: 4 }}>{visits.length}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div style={{ maxHeight: 350, overflowY: 'auto' }}>
        {visits.length === 0 ? (
          <div className="table-empty"><i className="bi bi-inbox" style={{ display: 'block', fontSize: '1.5rem', marginBottom: 6, opacity: 0.3 }} />Queue empty</div>
        ) : visits.map((v, i) => (
          <div key={v.id} className={`queue-item ${v.triage_data?.priority === 'immediate' ? 'immediate' : v.triage_data?.priority === 'urgent' ? 'urgent' : ''}`}>
            <div className="queue-number" style={{ background: color }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{v.patient_name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{v.visit_number} · {v.specialist_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeAgo(v.check_in_time)}</div>
              {v.doctor_name && <div style={{ fontSize: '0.68rem', color }}>{v.doctor_name}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Queue Monitor</h1><p className="page-subtitle">Live view — refreshes every 30 seconds</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>
      {loading && queue.length === 0 ? <Loading /> : (
        <div className="grid-2">
          <GroupCard title="Awaiting Triage"     visits={groups.payment_done} color="var(--color-info)"    icon="bi-hourglass-split"          statusKey="payment_done" />
          <GroupCard title="Awaiting Doctor"      visits={groups.triage_done}  color="var(--color-warning)" icon="bi-person-raised-hand"        statusKey="triage_done" />
          <GroupCard title="In Consultation"      visits={groups.in_consult}   color="var(--color-primary)" icon="bi-chat-square-text-fill"     statusKey="in_consult" />
          <GroupCard title="Paused (Lab/Radiology)" visits={groups.paused}    color="var(--color-accent)"  icon="bi-pause-circle-fill"         statusKey="paused" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  INVOICES PAGE
// ═══════════════════════════════════════════════════════════
function InvoicesPage({ onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', reference: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await invoicesAPI.list({ search, status: statusFilter || undefined });
      setInvoices(Array.isArray(data) ? data : data.results || []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await invoicesAPI.addPayment(payModal.id, payForm);
      toast.success('Payment recorded');
      setPayModal(null);
      load();
    } catch { toast.error('Failed to record payment'); }
  };

  const cols = [
    { label: 'Invoice No', render: r => <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'var(--color-primary)' }}>{r.invoice_number}</span> },
    { label: 'Patient',    render: r => <div><span style={{ fontWeight: 600 }}>{r.patient_name}</span><div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.patient_number}</div></div> },
    { label: 'Visit',      render: r => <span className="visit-id">{r.visit_number}</span> },
    { label: 'Total',      render: r => formatKES(r.total_amount) },
    { label: 'SHA',        render: r => formatKES(r.sha_amount) },
    { label: 'Patient Due',render: r => formatKES(r.patient_amount) },
    { label: 'Paid',       render: r => <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{formatKES(r.amount_paid)}</span> },
    { label: 'Balance',    render: r => <span style={{ color: Number(r.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }}>{formatKES(r.balance)}</span> },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: '',           render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button>
        {r.status !== 'paid' && r.status !== 'waived' && (
          <button className="btn btn-success btn-sm" onClick={() => { setPayModal(r); setPayForm({ amount: r.balance, method: 'Cash', reference: '', notes: '' }); }}>
            <i className="bi bi-cash" /> Pay
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Invoices</h1></div>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search by invoice, patient, visit…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['paid','partial','pending','waived','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={invoices} loading={loading} emptyIcon="bi-receipt-cutoff" emptyText="No invoices found" />
      </div>

      {/* Invoice detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Invoice ${selected?.invoice_number}`} size="lg" icon="bi-receipt">
        {selected && (
          <div>
            <div className="form-row-2" style={{ marginBottom: 16 }}>
              <div><DetailRow label="Patient"     value={selected.patient_name} /><DetailRow label="Patient No" value={selected.patient_number} /></div>
              <div><DetailRow label="Visit"       value={selected.visit_number} /><DetailRow label="Status"     ><StatusBadge status={selected.status} /></DetailRow></div>
            </div>
            <div className="card-header"><h3 className="card-title">Line Items</h3></div>
            <table className="table" style={{ marginBottom: 16 }}>
              <thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>SHA</th></tr></thead>
              <tbody>
                {selected.items?.map((it, i) => (
                  <tr key={i}>
                    <td>{it.description}</td>
                    <td><span className="badge badge-muted">{it.category}</span></td>
                    <td>{it.quantity}</td>
                    <td>{formatKES(it.unit_price)}</td>
                    <td>{formatKES(it.total)}</td>
                    <td>{it.sha_covered ? <span className="sha-badge">SHA</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
              <div><div className="form-label">Total</div><div style={{ fontWeight: 700 }}>{formatKES(selected.total_amount)}</div></div>
              <div><div className="form-label">SHA Covered</div><div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatKES(selected.sha_amount)}</div></div>
              <div><div className="form-label">Patient Due</div><div style={{ fontWeight: 700 }}>{formatKES(selected.patient_amount)}</div></div>
              <div><div className="form-label">Amount Paid</div><div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatKES(selected.amount_paid)}</div></div>
              <div><div className="form-label">Balance</div><div style={{ fontWeight: 700, color: Number(selected.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatKES(selected.balance)}</div></div>
            </div>
            {selected.payments?.length > 0 && (
              <div>
                <div className="form-section-title">Payments</div>
                <DataTable columns={[
                  { label: 'Method', key: 'method' },
                  { label: 'Amount', render: p => formatKES(p.amount) },
                  { label: 'Reference', key: 'reference' },
                  { label: 'Received By', key: 'received_by_name' },
                  { label: 'Time', render: p => formatDateTime(p.paid_at) },
                ]} data={selected.payments} loading={false} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Payment modal */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Record Payment" size="sm" icon="bi-cash-coin"
        footer={<><button className="btn btn-outline-muted btn-sm" onClick={() => setPayModal(null)}>Cancel</button><button className="btn btn-success btn-sm" form="payForm" type="submit"><i className="bi bi-check2" /> Record</button></>}>
        {payModal && (
          <form id="payForm" onSubmit={handleAddPayment}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>Balance due: <strong>{formatKES(payModal.balance)}</strong></p>
            <Field label="Amount" required><input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} step="0.01" /></Field>
            <Field label="Method" required>
              <select className="form-control" value={payForm.method} onChange={e => setPayForm(f => ({...f, method: e.target.value}))}>
                {['Cash','M-Pesa','SHA','Insurance','Bank','Waiver'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Reference"><input className="form-control" value={payForm.reference} onChange={e => setPayForm(f => ({...f, reference: e.target.value}))} placeholder="M-Pesa ref, receipt, etc." /></Field>
            <Field label="Notes"><textarea className="form-control" value={payForm.notes} onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} rows={2} /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════
export default function ReceptionistDashboard({ activePage, onNavigate }) {
  const [contextData, setContextData] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);

  const navigate = (page, data = null) => {
    setContextData(data);
    onNavigate(page);
  };

  // Patient detail modal
  const [patientVisits, setPatientVisits] = useState([]);
  useEffect(() => {
    if (patientDetail) {
      patientsAPI.getVisits(patientDetail.id).then(r => setPatientVisits(r.data));
    }
  }, [patientDetail]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':     return <DashboardPage onNavigate={navigate} />;
      case 'search':        return <PatientSearchPage onNavigate={navigate} onSelectPatient={setPatientDetail} />;
      case 'register':      return <RegisterPatientPage onNavigate={navigate} editPatient={contextData?.patient_number ? contextData : null} />;
      case 'patients_list': return <PatientsListPage onNavigate={navigate} onSelectPatient={setPatientDetail} />;
      case 'new_visit':     return <NewVisitPage onNavigate={navigate} preselectedPatient={contextData} />;
      case 'visits_today':  return <VisitsTodayPage onNavigate={navigate} />;
      case 'queue':         return <QueuePage onNavigate={navigate} />;
      case 'invoices':      return <InvoicesPage onNavigate={navigate} />;
      default:              return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <>
      {renderPage()}

      {/* Patient Detail Modal */}
      <Modal isOpen={!!patientDetail} onClose={() => setPatientDetail(null)} title={patientDetail?.full_name} size="lg" icon="bi-person-circle">
        {patientDetail && (
          <div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <DetailRow label="Patient No"  value={patientDetail.patient_number} />
                <DetailRow label="Date of Birth" value={formatDate(patientDetail.date_of_birth)} />
                <DetailRow label="Gender"       value={patientDetail.gender} />
                <DetailRow label="Phone"        value={patientDetail.phone} />
                <DetailRow label="Blood Group"  value={patientDetail.blood_group} />
              </div>
              <div>
                <DetailRow label="SHA Number"   value={patientDetail.sha_number || '—'} />
                <DetailRow label="Insurance"    >{patientDetail.sha_verified ? <span className="sha-badge">SHA Verified ✓</span> : 'Not Insured'}</DetailRow>
                <DetailRow label="Allergies"    value={patientDetail.allergies || '—'} />
                <DetailRow label="Chronic"      value={patientDetail.chronic_conditions || '—'} />
              </div>
            </div>
            <div className="form-section-title">Recent Visits ({patientVisits.length})</div>
            <DataTable columns={[
              { label: 'Visit No',   render: r => <span className="visit-id">{r.visit_number}</span> },
              { label: 'Specialist', key: 'specialist_name' },
              { label: 'Status',     render: r => <StatusBadge status={r.status} label={r.status_display} /> },
              { label: 'Date',       render: r => formatDate(r.check_in_time) },
            ]} data={patientVisits} loading={false} />
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { navigate('new_visit', patientDetail); setPatientDetail(null); }}>
                <i className="bi bi-clipboard-plus" /> New Visit
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { navigate('register', patientDetail); setPatientDetail(null); }}>
                <i className="bi bi-pencil" /> Edit Patient
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}