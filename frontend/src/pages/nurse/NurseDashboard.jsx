/**
 * pages/nurse/NurseDashboard.jsx
 * ================================
 * Pages: dashboard | triage_queue | triage_list | triage_form | patients_list | search
 */

import { useState, useEffect, useCallback } from 'react';
import { triageAPI, visitsAPI, patientsAPI, dashboardAPI } from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, PriorityBadge,
  Loading, toast, formatDate, formatDateTime, Field, SectionTitle,
  DetailRow, timeAgo, ConfirmDialog
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function NurseDashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), triageAPI.pending()])
      .then(([s, t]) => { setStats(s.data); setPending(t.data); })
      .catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Nursing Dashboard</h1><p className="page-subtitle">Triage and patient management</p></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('triage_queue')}>
          <i className="bi bi-list-ol" /> Triage Queue
        </button>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-hourglass-split"      iconBg="#FFF8E1"  iconColor="var(--color-warning)" value={pending.length}          label="Awaiting Triage" subColor="var(--color-warning)" sub="Need vitals recorded" />
        <StatCard icon="bi-people-fill"           iconBg="#E8F5F3"  iconColor="var(--color-primary)" value={stats?.today_visits}     label="Today's Visits" />
        <StatCard icon="bi-chat-square-text-fill" iconBg="#EDE7F6"  iconColor="#7B1FA2"              value={stats?.in_consultation}  label="In Consultation" />
        <StatCard icon="bi-person-lines-fill"     iconBg="#E3F2FD"  iconColor="#1565C0"              value={stats?.total_patients}   label="Total Patients" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="bi bi-hourglass-split" style={{ marginRight: 6, color: 'var(--color-warning)' }} />Patients Awaiting Triage ({pending.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('triage_queue')}>Full Queue</button>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><h4>All caught up!</h4><p>No patients awaiting triage</p></div>
        ) : pending.slice(0, 5).map((v, i) => (
          <div key={v.id} className="queue-item" onClick={() => onNavigate('triage_form', v)}>
            <div className="queue-number">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{v.patient_name}</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{v.visit_number} · {v.specialist_name}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{timeAgo(v.check_in_time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Triage Queue ──────────────────────────────────────────────────────────────
function TriageQueuePage({ onNavigate }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    triageAPI.pending()
      .then(r => setQueue(r.data))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  if (loading && queue.length === 0) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Triage Queue</h1><p className="page-subtitle">{queue.length} patients awaiting triage · Auto-refreshes every 20s</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>

      {queue.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-circle" /></div><h4>Queue Empty</h4><p>No patients awaiting triage at this time.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {queue.map((v, i) => (
            <div key={v.id} className="card card-sm" style={{ cursor: 'pointer', border: '1px solid var(--color-border)' }} onClick={() => onNavigate('triage_form', v)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v.patient_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{v.visit_number} · {v.specialist_name} · Checked in {timeAgo(v.check_in_time)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={v.status} label={v.status_display} />
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate('triage_form', v); }}>
                    <i className="bi bi-clipboard2-pulse" /> Record Vitals
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Triage Form ───────────────────────────────────────────────────────────────
const BLANK_TRIAGE = {
  temperature: '', pulse_rate: '', respiratory_rate: '',
  bp_systolic: '', bp_diastolic: '', oxygen_saturation: '',
  weight: '', height: '', blood_sugar: '',
  presenting_complaint: '', priority: 'normal', triage_notes: '',
};

function TriageFormPage({ onNavigate, preselectedVisit }) {
  const [selectedVisit, setSelectedVisit] = useState(preselectedVisit || null);
  const [visitQuery, setVisitQuery] = useState('');
  const [visitResults, setVisitResults] = useState([]);
  const [form, setForm] = useState({ ...BLANK_TRIAGE, visit: preselectedVisit?.id || '' });
  const [saving, setSaving] = useState(false);

  const bmi = form.weight && form.height
    ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1)
    : null;

  const searchVisit = async (q) => {
    setVisitQuery(q);
    if (q.length < 2) { setVisitResults([]); return; }
    const { data } = await visitsAPI.list({ search: q, status: 'payment_done' });
    setVisitResults(Array.isArray(data) ? data : data.results || []);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visit) { toast.error('Select a visit first'); return; }
    if (!form.presenting_complaint.trim()) { toast.error('Presenting complaint is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      payload.visit = form.visit;
      payload.presenting_complaint = form.presenting_complaint;
      payload.priority = form.priority;
      await triageAPI.create(payload);
      toast.success('Triage recorded successfully');
      onNavigate('triage_queue');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save triage');
    } finally { setSaving(false); }
  };

  const VitalInput = ({ label, name, unit, icon, min, max }) => {
    const val = parseFloat(form[name]);
    const isAbnormal = !isNaN(val) && min !== undefined && max !== undefined && (val < min || val > max);
    return (
      <div className={`vital-box ${isAbnormal ? 'abnormal' : ''}`} style={{ textAlign: 'left', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <i className={`bi ${icon}`} style={{ color: isAbnormal ? 'var(--color-warning)' : 'var(--color-text-muted)', fontSize: '0.85rem' }} />
          <span className="vital-label" style={{ fontSize: '0.7rem' }}>{label}</span>
          {unit && <span className="vital-unit" style={{ marginLeft: 'auto' }}>{unit}</span>}
        </div>
        <input type="number" className="form-control" value={form[name]} onChange={set(name)} placeholder="—" step="any" style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', padding: '6px 10px' }} />
        {isAbnormal && <div style={{ fontSize: '0.65rem', color: 'var(--color-warning)', marginTop: 3, fontWeight: 600 }}>⚠ Abnormal</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Record Triage Vitals</h1></div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('triage_queue')}><i className="bi bi-arrow-left" /> Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Visit selection */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-clipboard-fill">Select Visit</SectionTitle>
          {selectedVisit ? (
            <div style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 10, border: '1px solid var(--color-primary-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{selectedVisit.patient_name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{selectedVisit.visit_number} · {selectedVisit.specialist_name}</div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSelectedVisit(null); setForm(f => ({...f, visit: ''})); }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <SearchInput value={visitQuery} onChange={searchVisit} onClear={() => { setVisitQuery(''); setVisitResults([]); }} placeholder="Search by patient name or visit number…" />
              {visitResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', zIndex: 100 }}>
                  {visitResults.map(v => (
                    <div key={v.id} onClick={() => { setSelectedVisit(v); setForm(f => ({...f, visit: v.id})); setVisitQuery(v.patient_name); setVisitResults([]); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4F3'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ fontWeight: 600 }}>{v.patient_name}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{v.visit_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vitals */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-heart-pulse-fill">Vital Signs</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <VitalInput label="Temperature"   name="temperature"      unit="°C"    icon="bi-thermometer-half"   min={35.5} max={37.5} />
            <VitalInput label="Pulse Rate"    name="pulse_rate"       unit="bpm"   icon="bi-heart-pulse"        min={60}   max={100} />
            <VitalInput label="Resp. Rate"    name="respiratory_rate" unit="/min"  icon="bi-lungs-fill"         min={12}   max={20} />
            <VitalInput label="BP Systolic"   name="bp_systolic"      unit="mmHg"  icon="bi-activity"           min={90}   max={140} />
            <VitalInput label="BP Diastolic"  name="bp_diastolic"     unit="mmHg"  icon="bi-activity"           min={60}   max={90} />
            <VitalInput label="SpO₂"          name="oxygen_saturation"unit="%"     icon="bi-droplet-fill"       min={95}   max={100} />
            <VitalInput label="Weight"        name="weight"           unit="kg"    icon="bi-person-standing"    />
            <VitalInput label="Height"        name="height"           unit="cm"    icon="bi-rulers"             />
            <VitalInput label="Blood Sugar"   name="blood_sugar"      unit="mmol/L"icon="bi-droplet-half"       min={3.9}  max={7.8} />
            {bmi && (
              <div className={`vital-box ${parseFloat(bmi) > 30 || parseFloat(bmi) < 18.5 ? 'abnormal' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><i className="bi bi-calculator" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }} /><span className="vital-label">BMI (calc)</span></div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>{bmi}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Auto-calculated</div>
              </div>
            )}
          </div>
        </div>

        {/* Assessment */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-clipboard2-text-fill">Clinical Assessment</SectionTitle>
          <Field label="Presenting Complaint" required>
            <textarea className="form-control" value={form.presenting_complaint} onChange={set('presenting_complaint')} rows={3} placeholder="Chief complaint as stated by patient…" />
          </Field>
          <div className="form-row-2">
            <Field label="Triage Priority" required>
              <select className="form-control" value={form.priority} onChange={set('priority')}>
                <option value="immediate">🔴 Immediate (Resuscitation)</option>
                <option value="urgent">🟠 Urgent (Emergent)</option>
                <option value="normal">🟢 Normal (Less Urgent)</option>
                <option value="non_urgent">🔵 Non-Urgent (Minor)</option>
              </select>
            </Field>
            <Field label="Triage Notes">
              <textarea className="form-control" value={form.triage_notes} onChange={set('triage_notes')} rows={3} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('triage_queue')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><i className="bi bi-check2" /> Record Triage</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── All Triage Records ────────────────────────────────────────────────────────
function TriageListPage({ onNavigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    triageAPI.list({ priority: filter || undefined })
      .then(r => setRecords(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load triage records'))
      .finally(() => setLoading(false));
  }, [filter]);

  const cols = [
    { label: 'Visit',      render: r => <span className="visit-id">{r.visit}</span> },
    { label: 'Priority',   render: r => <PriorityBadge priority={r.priority} /> },
    { label: 'Temp (°C)',  render: r => r.temperature || '—' },
    { label: 'Pulse (bpm)',render: r => r.pulse_rate || '—' },
    { label: 'BP',         render: r => r.bp ? r.bp : '—' },
    { label: 'SpO₂ %',    render: r => r.oxygen_saturation ? `${r.oxygen_saturation}%` : '—' },
    { label: 'BMI',        render: r => r.bmi || '—' },
    { label: 'Triaged By', render: r => r.triaged_by_name || '—' },
    { label: 'Time',       render: r => timeAgo(r.triaged_at) },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Triage Records</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('triage_form')}><i className="bi bi-plus" /> Record Vitals</button>
      </div>
      <div className="filter-bar">
        <select className="form-control" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="immediate">Immediate</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
          <option value="non_urgent">Non-Urgent</option>
        </select>
      </div>
      <div className="card">
        <DataTable columns={cols} data={records} loading={loading} emptyIcon="bi-clipboard2-x" emptyText="No triage records found" onRowClick={setSelected} />
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Triage Details" size="md" icon="bi-clipboard2-pulse">
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                ['Temperature', `${selected.temperature || '—'} °C`],
                ['Pulse Rate', `${selected.pulse_rate || '—'} bpm`],
                ['Respiratory', `${selected.respiratory_rate || '—'} /min`],
                ['Blood Pressure', selected.bp || '—'],
                ['SpO₂', `${selected.oxygen_saturation || '—'}%`],
                ['Blood Sugar', `${selected.blood_sugar || '—'} mmol/L`],
                ['Weight', `${selected.weight || '—'} kg`],
                ['Height', `${selected.height || '—'} cm`],
                ['BMI', selected.bmi || '—'],
              ].map(([l, v]) => (
                <div key={l} className="vital-box" style={{ padding: 10 }}>
                  <div className="vital-label">{l}</div>
                  <div className="vital-value" style={{ fontSize: '1rem' }}>{v}</div>
                </div>
              ))}
            </div>
            <DetailRow label="Priority"><PriorityBadge priority={selected.priority} /></DetailRow>
            <DetailRow label="Complaint" value={selected.presenting_complaint} />
            <DetailRow label="Notes"     value={selected.triage_notes || '—'} />
            <DetailRow label="Triaged By" value={selected.triaged_by_name} />
            <DetailRow label="Triaged At" value={formatDateTime(selected.triaged_at)} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Patients List (read-only for nurses) ─────────────────────────────────────
function PatientsListPage({ onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    patientsAPI.list({ search })
      .then(r => setPatients(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Name',       render: r => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
    { label: 'Age/Gender', render: r => `${r.age} · ${r.gender}` },
    { label: 'Phone',      key: 'phone' },
    { label: 'Allergies',  render: r => r.allergies && r.allergies !== 'None' ? <span className="badge badge-warning">{r.allergies}</span> : '—' },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Patients</h1></div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patients…" style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={patients} loading={loading} onRowClick={setSelected} />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.full_name} size="md" icon="bi-person-circle">
        {selected && (
          <div>
            <DetailRow label="Patient No" value={selected.patient_number} />
            <DetailRow label="Age"        value={selected.age} />
            <DetailRow label="Gender"     value={selected.gender} />
            <DetailRow label="Blood Grp"  value={selected.blood_group} />
            <DetailRow label="Allergies"  value={selected.allergies} />
            <DetailRow label="Chronic"    value={selected.chronic_conditions} />
            <DetailRow label="Phone"      value={selected.phone} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function NurseDashboard({ activePage, onNavigate }) {
  const [ctx, setCtx] = useState(null);
  const navigate = (page, data = null) => { setCtx(data); onNavigate(page); };

  switch (activePage) {
    case 'triage_queue':  return <TriageQueuePage onNavigate={navigate} />;
    case 'triage_list':   return <TriageListPage  onNavigate={navigate} />;
    case 'triage_form':   return <TriageFormPage  onNavigate={navigate} preselectedVisit={ctx} />;
    case 'patients_list': return <PatientsListPage onNavigate={navigate} />;
    case 'search':        return <PatientsListPage onNavigate={navigate} />;
    default:              return <NurseDashboardPage onNavigate={navigate} />;
  }
}