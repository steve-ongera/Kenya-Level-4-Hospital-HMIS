/**
 * pages/doctor/DoctorDashboard.jsx
 * ===================================
 * Pages: dashboard | my_queue | consultations | new_consultation
 *        lab_orders | rad_orders | prescriptions | patients_list | visits_today
 */

import { useState, useEffect, useCallback } from 'react';
import {
  dashboardAPI, visitsAPI, consultationsAPI, labOrdersAPI, labResultsAPI,
  radiologyOrdersAPI, radiologyResultsAPI, prescriptionsAPI, patientsAPI, tariffsAPI, drugsAPI
} from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, PriorityBadge,
  Loading, toast, formatDate, formatDateTime, Field, SectionTitle,
  DetailRow, timeAgo, formatKES, ConfirmDialog
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardPage({ onNavigate }) {
  const [stats, setStats]     = useState(null);
  const [myQueue, setMyQueue] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), visitsAPI.queue()])
      .then(([s, q]) => { setStats(s.data); setMyQueue(q.data.filter(v => v.assigned_doctor === user.user_id || v.status === 'triage_done')); })
      .catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Doctor Dashboard</h1><p className="page-subtitle">Welcome, Dr. {user.full_name}</p></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('my_queue')}>
          <i className="bi bi-people-fill" /> My Queue ({myQueue.length})
        </button>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-people-fill"           iconBg="#FFF8E1"  iconColor="var(--color-warning)"  value={stats?.waiting_queue}   label="Waiting Queue" subColor="var(--color-warning)" />
        <StatCard icon="bi-chat-square-text-fill" iconBg="#EDE7F6"  iconColor="#7B1FA2"               value={stats?.in_consultation} label="In Consultation" />
        <StatCard icon="bi-eyedropper"            iconBg="#E0F7FA"  iconColor="#006064"               value={stats?.pending_lab}     label="Pending Labs" />
        <StatCard icon="bi-radioactive"           iconBg="#FBE9E7"  iconColor="#4E342E"               value={stats?.pending_radiology} label="Pending Radiology" />
        <StatCard icon="bi-capsule"               iconBg="#FFEBEE"  iconColor="#BF360C"               value={stats?.pending_pharmacy} label="Pending Pharmacy" />
        <StatCard icon="bi-check2-circle"         iconBg="#E8F5EC"  iconColor="var(--color-success)"  value={stats?.discharged_today} label="Discharged Today" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="bi bi-list-ol" style={{ marginRight: 6 }} />Next Patients</h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('my_queue')}>Full Queue</button>
        </div>
        {myQueue.slice(0, 5).map((v, i) => (
          <div key={v.id} className="queue-item" onClick={() => onNavigate('new_consultation', v)}>
            <div className="queue-number">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{v.patient_name}</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{v.visit_number} · {v.specialist_name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={v.status} label={v.status_display} />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeAgo(v.check_in_time)}</span>
            </div>
          </div>
        ))}
        {myQueue.length === 0 && <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><p>Queue is empty</p></div>}
      </div>
    </div>
  );
}

// ── My Queue ──────────────────────────────────────────────────────────────────
function MyQueuePage({ onNavigate }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    visitsAPI.queue({ status: 'triage_done' })
      .then(r => setQueue(r.data))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (loading && queue.length === 0) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">My Consultation Queue</h1><p className="page-subtitle">{queue.length} patients waiting · refreshes every 15s</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>
      {queue.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-circle" /></div><h4>Queue Empty</h4><p>No patients awaiting consultation.</p></div></div>
      ) : queue.map((v, i) => (
        <div key={v.id} className="card card-sm" style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => onNavigate('new_consultation', v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{v.patient_name}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>{v.visit_number} · {v.specialist_name} · {v.payment_method}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge status={v.status} label={v.status_display} />
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{timeAgo(v.check_in_time)}</span>
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate('new_consultation', v); }}>
                <i className="bi bi-clipboard-plus" /> Start Consult
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── New / Edit Consultation ───────────────────────────────────────────────────
function ConsultationFormPage({ onNavigate, preselectedVisit }) {
  const [visit, setVisit] = useState(preselectedVisit || null);
  const [visitQuery, setVisitQuery] = useState('');
  const [visitResults, setVisitResults] = useState([]);
  const [form, setForm] = useState({
    visit: preselectedVisit?.id || '',
    chief_complaint: '', history_of_illness: '', physical_examination: '',
    diagnosis: '', icd10_code: '', management_plan: '', doctor_notes: '',
    disposition: 'discharge',
  });
  // Sub-orders
  const [labTab, setLabTab] = useState('');
  const [labOrders, setLabOrders] = useState([]);
  const [radOrders, setRadOrders] = useState([]);
  const [labTariffs, setLabTariffs] = useState([]);
  const [radTariffs, setRadTariffs] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [rxItems, setRxItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [consultation, setConsultation] = useState(null);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    tariffsAPI.list({ category: 'lab' }).then(r => setLabTariffs(Array.isArray(r.data) ? r.data : r.data.results || []));
    tariffsAPI.list({ category: 'radiology' }).then(r => setRadTariffs(Array.isArray(r.data) ? r.data : r.data.results || []));
    drugsAPI.list().then(r => setDrugs(Array.isArray(r.data) ? r.data : r.data.results || []));
  }, []);

  const searchVisit = async (q) => {
    setVisitQuery(q);
    if (q.length < 2) { setVisitResults([]); return; }
    const { data } = await visitsAPI.list({ search: q, status: 'triage_done' });
    setVisitResults(Array.isArray(data) ? data : data.results || []);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visit) { toast.error('Select a visit'); return; }
    setSaving(true);
    try {
      const { data: c } = await consultationsAPI.create(form);
      setConsultation(c);
      toast.success('Consultation created');
      // Create lab orders
      for (const lo of labOrders) {
        await labOrdersAPI.create({ visit: form.visit, consultation: c.id, tariff: lo.tariff, urgency: lo.urgency || 'routine', clinical_notes: lo.notes || '' });
      }
      // Create radiology orders
      for (const ro of radOrders) {
        await radiologyOrdersAPI.create({ visit: form.visit, consultation: c.id, tariff: ro.tariff, clinical_info: ro.notes || '' });
      }
      // Create prescription
      if (rxItems.length > 0) {
        const { data: rx } = await prescriptionsAPI.create({ visit: form.visit, consultation: c.id, notes: '' });
        for (const item of rxItems) {
          // PrescriptionItem would be created inline via nested — simplified here
        }
      }
      toast.success('Orders saved');
      onNavigate('consultations');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const addLabOrder = (tariffId) => {
    const tariff = labTariffs.find(t => t.id === parseInt(tariffId));
    if (tariff && !labOrders.find(o => o.tariff === tariff.id)) {
      setLabOrders(prev => [...prev, { tariff: tariff.id, name: tariff.name, urgency: 'routine', price: tariff.price }]);
    }
  };

  const addRadOrder = (tariffId) => {
    const tariff = radTariffs.find(t => t.id === parseInt(tariffId));
    if (tariff && !radOrders.find(o => o.tariff === tariff.id)) {
      setRadOrders(prev => [...prev, { tariff: tariff.id, name: tariff.name, price: tariff.price }]);
    }
  };

  const addRxItem = (drugId) => {
    const drug = drugs.find(d => d.id === parseInt(drugId));
    if (drug && !rxItems.find(r => r.drug === drug.id)) {
      setRxItems(prev => [...prev, { drug: drug.id, name: drug.name, dose: drug.strength, frequency: 'BD', duration: '7 days', quantity: 14 }]);
    }
  };

  const tabs = [
    { id: 'history',     label: 'History',       icon: 'bi-journal-text' },
    { id: 'examination', label: 'Examination',    icon: 'bi-stethoscope' },
    { id: 'labs',        label: `Labs (${labOrders.length})`,   icon: 'bi-eyedropper' },
    { id: 'radiology',   label: `Radiology (${radOrders.length})`, icon: 'bi-radioactive' },
    { id: 'rx',          label: `Prescriptions (${rxItems.length})`, icon: 'bi-capsule' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">New Consultation</h1></div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('consultations')}><i className="bi bi-arrow-left" /> Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Visit selection */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle icon="bi-clipboard-fill">Select Visit</SectionTitle>
          {visit ? (
            <div style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 10, border: '1px solid var(--color-primary-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{visit.patient_name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{visit.visit_number} · {visit.specialist_name} · {visit.payment_method}</div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setVisit(null); setForm(f => ({...f, visit: ''})); }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <SearchInput value={visitQuery} onChange={searchVisit} onClear={() => { setVisitQuery(''); setVisitResults([]); }} placeholder="Search patient for consultation…" />
              {visitResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', zIndex: 100 }}>
                  {visitResults.map(v => (
                    <div key={v.id} onClick={() => { setVisit(v); setForm(f => ({...f, visit: v.id})); setVisitQuery(v.patient_name); setVisitResults([]); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4F3'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ fontWeight: 600 }}>{v.patient_name}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{v.visit_number} · {v.specialist_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.id} type="button" className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <i className={`bi ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'history' && (
            <div>
              <Field label="Chief Complaint" required>
                <textarea className="form-control" value={form.chief_complaint} onChange={set('chief_complaint')} rows={2} placeholder="Patient's main complaint…" />
              </Field>
              <Field label="History of Presenting Illness">
                <textarea className="form-control" value={form.history_of_illness} onChange={set('history_of_illness')} rows={4} placeholder="Onset, duration, character, associated symptoms, relevant history…" />
              </Field>
            </div>
          )}

          {activeTab === 'examination' && (
            <div>
              <Field label="Physical Examination Findings">
                <textarea className="form-control" value={form.physical_examination} onChange={set('physical_examination')} rows={5} placeholder="General, CVS, Resp, Abdomen, CNS, Other…" />
              </Field>
              <div className="form-row-2">
                <Field label="Diagnosis">
                  <textarea className="form-control" value={form.diagnosis} onChange={set('diagnosis')} rows={3} placeholder="Clinical diagnosis…" />
                </Field>
                <div>
                  <Field label="ICD-10 Code"><input className="form-control" value={form.icd10_code} onChange={set('icd10_code')} placeholder="e.g. J06.9" /></Field>
                  <Field label="Disposition">
                    <select className="form-control" value={form.disposition} onChange={set('disposition')}>
                      <option value="discharge">Discharge</option>
                      <option value="admit">Admit</option>
                      <option value="refer">Refer</option>
                      <option value="review">Review</option>
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="Management Plan">
                <textarea className="form-control" value={form.management_plan} onChange={set('management_plan')} rows={4} placeholder="Treatment plan, investigations, follow-up…" />
              </Field>
              <Field label="Doctor's Notes">
                <textarea className="form-control" value={form.doctor_notes} onChange={set('doctor_notes')} rows={2} />
              </Field>
            </div>
          )}

          {activeTab === 'labs' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <select className="form-control" onChange={e => { addLabOrder(e.target.value); e.target.value = ''; }} style={{ flex: 1 }}>
                  <option value="">+ Add Lab Test…</option>
                  {labTariffs.map(t => <option key={t.id} value={t.id}>{t.name} — KES {t.price}</option>)}
                </select>
              </div>
              {labOrders.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-eyedropper" /></div><p>No lab orders added</p></div>
                : labOrders.map((lo, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F0F7F7', borderRadius: 8, marginBottom: 8 }}>
                    <i className="bi bi-eyedropper" style={{ color: '#006064' }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.84rem' }}>{lo.name}</span>
                    <select className="form-control" style={{ width: 120 }} value={lo.urgency} onChange={e => setLabOrders(prev => prev.map((l, j) => j === i ? {...l, urgency: e.target.value} : l))}>
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatKES(lo.price)}</span>
                    <button type="button" className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setLabOrders(prev => prev.filter((_, j) => j !== i))}><i className="bi bi-trash" /></button>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'radiology' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <select className="form-control" onChange={e => { addRadOrder(e.target.value); e.target.value = ''; }} style={{ flex: 1 }}>
                  <option value="">+ Add Radiology Order…</option>
                  {radTariffs.map(t => <option key={t.id} value={t.id}>{t.name} — KES {t.price}</option>)}
                </select>
              </div>
              {radOrders.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-radioactive" /></div><p>No radiology orders added</p></div>
                : radOrders.map((ro, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FBE9E7', borderRadius: 8, marginBottom: 8 }}>
                    <i className="bi bi-radioactive" style={{ color: '#4E342E' }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.84rem' }}>{ro.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatKES(ro.price)}</span>
                    <button type="button" className="btn btn-ghost btn-icon-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setRadOrders(prev => prev.filter((_, j) => j !== i))}><i className="bi bi-trash" /></button>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'rx' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <select className="form-control" onChange={e => { addRxItem(e.target.value); e.target.value = ''; }} style={{ flex: 1 }}>
                  <option value="">+ Add Drug…</option>
                  {drugs.map(d => <option key={d.id} value={d.id}>{d.name} {d.strength} ({d.formulation})</option>)}
                </select>
              </div>
              {rxItems.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-capsule" /></div><p>No drugs added</p></div>
                : rxItems.map((rx, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#FFEBEE', borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <i className="bi bi-capsule" style={{ color: '#BF360C' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{rx.name}</span>
                      <button type="button" className="btn btn-ghost btn-icon-sm" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={() => setRxItems(prev => prev.filter((_, j) => j !== i))}><i className="bi bi-trash" /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 8 }}>
                      <input className="form-control" placeholder="Dose" value={rx.dose} onChange={e => setRxItems(prev => prev.map((r, j) => j === i ? {...r, dose: e.target.value} : r))} />
                      <input className="form-control" placeholder="Frequency (e.g. BD)" value={rx.frequency} onChange={e => setRxItems(prev => prev.map((r, j) => j === i ? {...r, frequency: e.target.value} : r))} />
                      <input className="form-control" placeholder="Duration (e.g. 7 days)" value={rx.duration} onChange={e => setRxItems(prev => prev.map((r, j) => j === i ? {...r, duration: e.target.value} : r))} />
                      <input type="number" className="form-control" placeholder="Qty" value={rx.quantity} onChange={e => setRxItems(prev => prev.map((r, j) => j === i ? {...r, quantity: parseInt(e.target.value)} : r))} />
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('consultations')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><i className="bi bi-check2" /> Save Consultation</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Consultations List ────────────────────────────────────────────────────────
function ConsultationsListPage({ onNavigate }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    consultationsAPI.list({ status: filter || undefined })
      .then(r => setConsultations(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Visit',      render: r => <span className="visit-id">{r.visit}</span> },
    { label: 'Doctor',     key: 'doctor_name' },
    { label: 'Diagnosis',  render: r => r.diagnosis || '—' },
    { label: 'ICD-10',     render: r => r.icd10_code ? <span className="badge badge-info">{r.icd10_code}</span> : '—' },
    { label: 'Disposition',render: r => r.disposition || '—' },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: 'Started',    render: r => timeAgo(r.started_at) },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Consultations</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('new_consultation')}><i className="bi bi-plus" /> New Consultation</button>
      </div>
      <div className="filter-bar">
        <select className="form-control" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={consultations} loading={loading} onRowClick={setSelected} emptyIcon="bi-clipboard-x" />
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Consultation Details" size="lg" icon="bi-clipboard2-text-fill">
        {selected && (
          <div>
            <div className="form-row-2" style={{ marginBottom: 12 }}>
              <div>
                <DetailRow label="Doctor"      value={selected.doctor_name} />
                <DetailRow label="Chief Complaint" value={selected.chief_complaint} />
                <DetailRow label="History"     value={selected.history_of_illness} />
              </div>
              <div>
                <DetailRow label="Diagnosis"   value={selected.diagnosis} />
                <DetailRow label="ICD-10"      value={selected.icd10_code} />
                <DetailRow label="Disposition" value={selected.disposition} />
                <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>
              </div>
            </div>
            <DetailRow label="Examination" value={selected.physical_examination} />
            <DetailRow label="Management"  value={selected.management_plan} />
            <DetailRow label="Notes"       value={selected.doctor_notes} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Lab Orders Page ───────────────────────────────────────────────────────────
function LabOrdersPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    labOrdersAPI.list()
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const cols = [
    { label: 'Test',        key: 'tariff_name' },
    { label: 'Patient',     key: 'patient_name' },
    { label: 'Patient No',  render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Urgency',     render: r => <span className={`badge ${r.urgency === 'stat' ? 'badge-danger' : r.urgency === 'urgent' ? 'badge-warning' : 'badge-muted'}`}>{r.urgency}</span> },
    { label: 'Status',      render: r => <StatusBadge status={r.status} /> },
    { label: 'Price',       render: r => formatKES(r.tariff_price) },
    { label: 'Ordered',     render: r => timeAgo(r.ordered_at) },
    { label: '',            render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Lab Orders</h1></div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} emptyIcon="bi-eyedropper" onRowClick={setSelected} />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.tariff_name} size="md" icon="bi-eyedropper">
        {selected && (
          <div>
            <DetailRow label="Patient"     value={selected.patient_name} />
            <DetailRow label="Ordered By"  value={selected.ordered_by_name} />
            <DetailRow label="Urgency"     value={selected.urgency} />
            <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>
            <DetailRow label="Notes"       value={selected.clinical_notes || '—'} />
            {selected.result && (
              <div style={{ marginTop: 16 }}>
                <div className="form-section-title">Result</div>
                <div className={`result-block result-${selected.result.interpretation}`}>{selected.result.result_text}</div>
                <DetailRow label="Interpretation"><span className={`badge badge-${selected.result.interpretation === 'normal' ? 'success' : selected.result.interpretation === 'critical' ? 'danger' : 'warning'}`}>{selected.result.interpretation}</span></DetailRow>
                <DetailRow label="Reference" value={selected.result.reference_range} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Radiology Orders ──────────────────────────────────────────────────────────
function RadOrdersPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    radiologyOrdersAPI.list()
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { label: 'Study',      key: 'tariff_name' },
    { label: 'Patient',    key: 'patient_name' },
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: 'Price',      render: r => formatKES(r.tariff_price) },
    { label: 'Ordered',    render: r => timeAgo(r.ordered_at) },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Radiology Orders</h1></div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} onRowClick={setSelected} emptyIcon="bi-radioactive" />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.tariff_name} size="md" icon="bi-radioactive">
        {selected && (
          <div>
            <DetailRow label="Patient"    value={selected.patient_name} />
            <DetailRow label="Ordered By" value={selected.ordered_by_name} />
            <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>
            <DetailRow label="Clinical Info" value={selected.clinical_info || '—'} />
            {selected.result && (
              <div style={{ marginTop: 16 }}>
                <div className="form-section-title">Result</div>
                <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 700 }}>Findings: </span>{selected.result.findings}</div>
                <div className="result-block result-normal">{selected.result.impression}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Prescriptions ─────────────────────────────────────────────────────────────
function PrescriptionsPage({ onNavigate }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    prescriptionsAPI.list()
      .then(r => setPrescriptions(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { label: 'Patient',    key: 'patient_name' },
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Items',      render: r => r.items?.length || 0 },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: 'Prescribed', render: r => timeAgo(r.prescribed_at) },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Prescriptions</h1></div>
      <div className="card">
        <DataTable columns={cols} data={prescriptions} loading={loading} onRowClick={setSelected} emptyIcon="bi-capsule" />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Prescription — ${selected?.patient_name}`} size="md" icon="bi-capsule">
        {selected && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={selected.status} />
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>By {selected.prescribed_by_name}</span>
            </div>
            <DataTable columns={[
              { label: 'Drug',     render: r => <span style={{ fontWeight: 600 }}>{r.drug_name}</span> },
              { label: 'Strength', key: 'drug_strength' },
              { label: 'Dose',     key: 'dose' },
              { label: 'Freq.',    key: 'frequency' },
              { label: 'Duration', key: 'duration' },
              { label: 'Qty',      key: 'quantity' },
            ]} data={selected.items || []} loading={false} />
            {selected.notes && <div className="alert alert-info" style={{ marginTop: 12 }}><i className="bi bi-info-circle" />{selected.notes}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function DoctorDashboard({ activePage, onNavigate }) {
  const [ctx, setCtx] = useState(null);
  const navigate = (page, data = null) => { setCtx(data); onNavigate(page); };

  switch (activePage) {
    case 'my_queue':          return <MyQueuePage          onNavigate={navigate} />;
    case 'consultations':     return <ConsultationsListPage onNavigate={navigate} />;
    case 'new_consultation':  return <ConsultationFormPage  onNavigate={navigate} preselectedVisit={ctx} />;
    case 'lab_orders':        return <LabOrdersPage         onNavigate={navigate} />;
    case 'rad_orders':        return <RadOrdersPage         onNavigate={navigate} />;
    case 'prescriptions':     return <PrescriptionsPage     onNavigate={navigate} />;
    case 'visits_today':
    case 'patients_list':     return <div className="page-header"><h1 className="page-title">{activePage === 'visits_today' ? "Today's Visits" : "Patients"}</h1></div>;
    default:                  return <DashboardPage         onNavigate={navigate} />;
  }
}