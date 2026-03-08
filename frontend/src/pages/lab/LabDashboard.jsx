/**
 * pages/lab/LabDashboard.jsx
 */

import { useState, useEffect, useCallback } from 'react';
import { labOrdersAPI, labResultsAPI, dashboardAPI } from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, Loading,
  toast, formatDateTime, Field, DetailRow, timeAgo, ConfirmDialog
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function LabDashboardPage({ onNavigate }) {
  const [stats, setStats]     = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), labOrdersAPI.pending()])
      .then(([s, p]) => { setStats(s.data); setPending(Array.isArray(p.data) ? p.data : p.data.results || []); })
      .catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Laboratory Dashboard</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('pending_tests')}>
          <i className="bi bi-clock" /> Pending Tests ({pending.length})
        </button>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-clock-fill"            iconBg="#FFF8E1" iconColor="var(--color-warning)"  value={stats?.pending_lab}   label="Pending Tests"   subColor="var(--color-warning)" />
        <StatCard icon="bi-check2-circle"         iconBg="#E8F5EC" iconColor="var(--color-success)"  value={null}                 label="Results Entered Today" />
        <StatCard icon="bi-people-fill"           iconBg="#E8F5F3" iconColor="var(--color-primary)"  value={stats?.today_visits}  label="Total Visits Today" />
        <StatCard icon="bi-exclamation-triangle"  iconBg="#FDEEEE" iconColor="var(--color-danger)"   value={null}                 label="Critical Results" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="bi bi-clock" style={{ marginRight: 6, color: 'var(--color-warning)' }} />Pending Tests ({pending.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('pending_tests')}>View All</button>
        </div>
        {pending.slice(0, 6).map((o, i) => (
          <div key={o.id} className={`queue-item ${o.urgency === 'stat' ? 'immediate' : o.urgency === 'urgent' ? 'urgent' : ''}`} onClick={() => onNavigate('enter_results', o)}>
            <div className="queue-number" style={{ background: o.urgency === 'stat' ? 'var(--color-danger)' : o.urgency === 'urgent' ? 'var(--color-warning)' : 'var(--color-info)' }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{o.tariff_name}</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.patient_name} · {o.patient_number}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${o.urgency === 'stat' ? 'badge-danger' : o.urgency === 'urgent' ? 'badge-warning' : 'badge-muted'}`}>{o.urgency?.toUpperCase()}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeAgo(o.ordered_at)}</span>
            </div>
          </div>
        ))}
        {pending.length === 0 && <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><p>No pending tests</p></div>}
      </div>
    </div>
  );
}

// ── Pending Tests ─────────────────────────────────────────────────────────────
function PendingTestsPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    labOrdersAPI.pending()
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const updateStatus = async (id, status) => {
    try { await labOrdersAPI.update(id, { status }); toast.success('Status updated'); load(); }
    catch { toast.error('Failed'); }
  };

  const cols = [
    { label: 'Test',     render: r => <span style={{ fontWeight: 600 }}>{r.tariff_name}</span> },
    { label: 'Patient',  key: 'patient_name' },
    { label: 'Pt. No',   render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Urgency',  render: r => <span className={`badge ${r.urgency === 'stat' ? 'badge-danger' : r.urgency === 'urgent' ? 'badge-warning' : 'badge-muted'}`}>{r.urgency?.toUpperCase()}</span> },
    { label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { label: 'Ordered',  render: r => timeAgo(r.ordered_at) },
    { label: 'Notes',    render: r => r.clinical_notes || '—' },
    { label: '',         render: r => (
      <div className="table-actions">
        {r.status === 'pending'    && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(r.id, 'collected')}>Collected</button>}
        {r.status === 'collected'  && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(r.id, 'processing')}>Processing</button>}
        {r.status !== 'resulted'   && <button className="btn btn-primary btn-sm" onClick={() => onNavigate('enter_results', r)}><i className="bi bi-pencil-square" /> Enter Result</button>}
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Pending Lab Tests</h1><p className="page-subtitle">{orders.length} pending · auto-refreshes every 20s</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} emptyIcon="bi-check2-all" emptyText="No pending tests" />
      </div>
    </div>
  );
}

// ── Enter Results ─────────────────────────────────────────────────────────────
function EnterResultsPage({ onNavigate, preselectedOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(preselectedOrder || null);
  const [orderQuery, setOrderQuery]       = useState(preselectedOrder ? `${preselectedOrder.tariff_name} — ${preselectedOrder.patient_name}` : '');
  const [orderResults, setOrderResults]   = useState([]);
  const [form, setForm] = useState({ result_text: '', interpretation: 'normal', reference_range: '', comments: '' });
  const [saving, setSaving] = useState(false);

  const searchOrders = async (q) => {
    setOrderQuery(q);
    if (q.length < 2) { setOrderResults([]); return; }
    const { data } = await labOrdersAPI.list({ search: q });
    const arr = (Array.isArray(data) ? data : data.results || []).filter(o => !o.result);
    setOrderResults(arr);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) { toast.error('Select a lab order first'); return; }
    if (!form.result_text.trim()) { toast.error('Result text is required'); return; }
    setSaving(true);
    try {
      await labResultsAPI.create({ order: selectedOrder.id, ...form });
      toast.success('Lab result saved');
      onNavigate('pending_tests');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save result'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Enter Lab Result</h1></div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('pending_tests')}><i className="bi bi-arrow-left" /> Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>
            <i className="bi bi-eyedropper" style={{ marginRight: 6 }} />Select Lab Order
          </div>
          {selectedOrder ? (
            <div style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 10, border: '1px solid var(--color-primary-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{selectedOrder.tariff_name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{selectedOrder.patient_name} · {selectedOrder.patient_number} · Ordered {timeAgo(selectedOrder.ordered_at)}</div>
                <span className={`badge ${selectedOrder.urgency === 'stat' ? 'badge-danger' : selectedOrder.urgency === 'urgent' ? 'badge-warning' : 'badge-muted'}`} style={{ marginTop: 4 }}>{selectedOrder.urgency?.toUpperCase()}</span>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSelectedOrder(null); setOrderQuery(''); }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <SearchInput value={orderQuery} onChange={searchOrders} onClear={() => { setOrderQuery(''); setOrderResults([]); }} placeholder="Search patient or test name…" />
              {orderResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', zIndex: 100 }}>
                  {orderResults.map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setOrderQuery(`${o.tariff_name} — ${o.patient_name}`); setOrderResults([]); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4F3'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ fontWeight: 600 }}>{o.tariff_name}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{o.patient_name} · {o.patient_number}</span>
                      <span className={`badge ${o.urgency === 'stat' ? 'badge-danger' : 'badge-muted'}`} style={{ marginLeft: 8 }}>{o.urgency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>
            <i className="bi bi-file-earmark-text" style={{ marginRight: 6 }} />Result Entry
          </div>
          <Field label="Result Text / Report" required>
            <textarea className="form-control" value={form.result_text} onChange={set('result_text')} rows={6} placeholder="Enter test results, measurements, observations…" style={{ fontFamily: 'DM Mono, monospace' }} />
          </Field>
          <div className="form-row-2">
            <Field label="Interpretation" required>
              <select className="form-control" value={form.interpretation} onChange={set('interpretation')}>
                <option value="normal">Normal</option>
                <option value="abnormal">Abnormal</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Reference Range">
              <input className="form-control" value={form.reference_range} onChange={set('reference_range')} placeholder="e.g. 4.0–11.0 × 10⁹/L" />
            </Field>
          </div>
          <Field label="Comments / Recommendations">
            <textarea className="form-control" value={form.comments} onChange={set('comments')} rows={2} placeholder="Any additional clinical comments…" />
          </Field>

          {form.interpretation === 'critical' && (
            <div className="alert alert-danger"><i className="bi bi-exclamation-triangle-fill" /><strong>Critical Result</strong> — Notify the ordering physician immediately.</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('pending_tests')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><i className="bi bi-check2" /> Save Result</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── All Lab Orders ────────────────────────────────────────────────────────────
function LabOrdersPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    labOrdersAPI.list({ search, status: statusFilter || undefined })
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Test',     render: r => <span style={{ fontWeight: 600 }}>{r.tariff_name}</span> },
    { label: 'Patient',  key: 'patient_name' },
    { label: 'Pt. No',   render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Urgency',  render: r => <span className={`badge ${r.urgency === 'stat' ? 'badge-danger' : r.urgency === 'urgent' ? 'badge-warning' : 'badge-muted'}`}>{r.urgency?.toUpperCase()}</span> },
    { label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { label: 'Result',   render: r => r.result ? <span className={`badge badge-${r.result.interpretation === 'normal' ? 'success' : r.result.interpretation === 'critical' ? 'danger' : 'warning'}`}>{r.result.interpretation}</span> : '—' },
    { label: 'Ordered',  render: r => timeAgo(r.ordered_at) },
    { label: '',         render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">All Lab Orders</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('enter_results')}><i className="bi bi-pencil-square" /> Enter Result</button>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patient, test…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','collected','processing','resulted','verified'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} onRowClick={setSelected} emptyIcon="bi-clipboard2-x" />
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.tariff_name} size="md" icon="bi-eyedropper">
        {selected && (
          <div>
            <DetailRow label="Patient"    value={selected.patient_name} />
            <DetailRow label="Patient No" value={selected.patient_number} />
            <DetailRow label="Ordered By" value={selected.ordered_by_name} />
            <DetailRow label="Urgency"    value={selected.urgency} />
            <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>
            <DetailRow label="Clinical Notes" value={selected.clinical_notes || '—'} />
            {selected.result && <>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Result</div>
                <div className={`result-block result-${selected.result.interpretation}`}>{selected.result.result_text}</div>
                <DetailRow label="Interpretation"><span className={`badge badge-${selected.result.interpretation === 'normal' ? 'success' : selected.result.interpretation === 'critical' ? 'danger' : 'warning'}`}>{selected.result.interpretation}</span></DetailRow>
                <DetailRow label="Reference" value={selected.result.reference_range} />
                <DetailRow label="Comments"  value={selected.result.comments} />
                <DetailRow label="By"        value={selected.result.performed_by_name} />
                <DetailRow label="At"        value={formatDateTime(selected.result.resulted_at)} />
              </div>
            </>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── All Results ───────────────────────────────────────────────────────────────
function LabResultsPage({ onNavigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    labResultsAPI.list()
      .then(r => setResults(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { label: 'Test',          render: r => r.order },
    { label: 'Interpretation',render: r => <span className={`badge badge-${r.interpretation === 'normal' ? 'success' : r.interpretation === 'critical' ? 'danger' : 'warning'}`}>{r.interpretation}</span> },
    { label: 'Performed By',  key: 'performed_by_name' },
    { label: 'Date',          render: r => formatDateTime(r.resulted_at) },
    { label: '',              render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">All Lab Results</h1></div>
      <div className="card">
        <DataTable columns={cols} data={results} loading={loading} onRowClick={setSelected} emptyIcon="bi-file-earmark-x" />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Lab Result" size="md" icon="bi-file-earmark-check-fill">
        {selected && (
          <div>
            <div className={`result-block result-${selected.interpretation}`} style={{ marginBottom: 12 }}>{selected.result_text}</div>
            <DetailRow label="Interpretation"><span className={`badge badge-${selected.interpretation === 'normal' ? 'success' : selected.interpretation === 'critical' ? 'danger' : 'warning'}`}>{selected.interpretation}</span></DetailRow>
            <DetailRow label="Reference Range" value={selected.reference_range} />
            <DetailRow label="Comments"        value={selected.comments} />
            <DetailRow label="Performed By"    value={selected.performed_by_name} />
            <DetailRow label="Date/Time"       value={formatDateTime(selected.resulted_at)} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function LabDashboard({ activePage, onNavigate }) {
  const [ctx, setCtx] = useState(null);
  const navigate = (page, data = null) => { setCtx(data); onNavigate(page); };

  switch (activePage) {
    case 'pending_tests':  return <PendingTestsPage  onNavigate={navigate} />;
    case 'enter_results':  return <EnterResultsPage  onNavigate={navigate} preselectedOrder={ctx} />;
    case 'lab_orders':     return <LabOrdersPage     onNavigate={navigate} />;
    case 'lab_results':    return <LabResultsPage    onNavigate={navigate} />;
    case 'patients_list':  return <div className="page-header"><h1 className="page-title">Patients</h1></div>;
    default:               return <LabDashboardPage  onNavigate={navigate} />;
  }
}