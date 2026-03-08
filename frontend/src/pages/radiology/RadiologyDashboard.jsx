/**
 * pages/radiology/RadiologyDashboard.jsx
 */

import { useState, useEffect, useCallback } from 'react';
import { radiologyOrdersAPI, radiologyResultsAPI, dashboardAPI } from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, Loading,
  toast, formatDateTime, Field, DetailRow, timeAgo
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function RadDashboardPage({ onNavigate }) {
  const [stats, setStats]     = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), radiologyOrdersAPI.pending()])
      .then(([s, p]) => { setStats(s.data); setPending(Array.isArray(p.data) ? p.data : p.data.results || []); })
      .catch(() => toast.error('Failed to load'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Radiology Dashboard</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('pending_scans')}>
          <i className="bi bi-radioactive" /> Pending Scans ({pending.length})
        </button>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-clock-fill"    iconBg="#FBE9E7" iconColor="#4E342E"               value={stats?.pending_radiology} label="Pending Scans" subColor="var(--color-warning)" />
        <StatCard icon="bi-people-fill"   iconBg="#E8F5F3" iconColor="var(--color-primary)"  value={stats?.today_visits}      label="Today's Visits" />
        <StatCard icon="bi-check2-circle" iconBg="#E8F5EC" iconColor="var(--color-success)"  value={null}                     label="Completed Today" />
        <StatCard icon="bi-radioactive"   iconBg="#FBE9E7" iconColor="#4E342E"               value={null}                     label="Total Orders" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="bi bi-radioactive" style={{ marginRight: 6, color: '#4E342E' }} />Pending Scans ({pending.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('pending_scans')}>View All</button>
        </div>
        {pending.slice(0, 6).map((o, i) => (
          <div key={o.id} className="queue-item" onClick={() => onNavigate('enter_scan_results', o)}>
            <div className="queue-number" style={{ background: '#4E342E' }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{o.tariff_name}</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{o.patient_name} · {o.patient_number}</div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeAgo(o.ordered_at)}</div>
          </div>
        ))}
        {pending.length === 0 && <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><p>No pending scans</p></div>}
      </div>
    </div>
  );
}

// ── Pending Scans ─────────────────────────────────────────────────────────────
function PendingScansPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    radiologyOrdersAPI.pending()
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const updateStatus = async (id, status) => {
    try { await radiologyOrdersAPI.update(id, { status }); toast.success('Status updated'); load(); }
    catch { toast.error('Failed'); }
  };

  const cols = [
    { label: 'Study',    render: r => <span style={{ fontWeight: 600 }}>{r.tariff_name}</span> },
    { label: 'Patient',  key: 'patient_name' },
    { label: 'Pt. No',   render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Status',   render: r => <StatusBadge status={r.status} /> },
    { label: 'Ordered',  render: r => timeAgo(r.ordered_at) },
    { label: 'Clinical', render: r => r.clinical_info ? r.clinical_info.substring(0, 40) + '…' : '—' },
    { label: '',         render: r => (
      <div className="table-actions">
        {r.status === 'pending'   && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(r.id, 'scheduled')}>Schedule</button>}
        {r.status === 'scheduled' && <button className="btn btn-outline btn-sm" onClick={() => updateStatus(r.id, 'performed')}>Performed</button>}
        <button className="btn btn-primary btn-sm" onClick={() => onNavigate('enter_scan_results', r)}><i className="bi bi-pencil-square" /> Enter Result</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Pending Scans</h1><p className="page-subtitle">{orders.length} pending · auto-refreshes every 20s</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} emptyIcon="bi-check2-all" emptyText="No pending scans" />
      </div>
    </div>
  );
}

// ── Enter Scan Results ────────────────────────────────────────────────────────
function EnterScanResultsPage({ onNavigate, preselectedOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(preselectedOrder || null);
  const [orderQuery, setOrderQuery]       = useState(preselectedOrder ? `${preselectedOrder.tariff_name} — ${preselectedOrder.patient_name}` : '');
  const [orderResults, setOrderResults]   = useState([]);
  const [form, setForm] = useState({ findings: '', impression: '', image_url: '' });
  const [saving, setSaving] = useState(false);

  const searchOrders = async (q) => {
    setOrderQuery(q);
    if (q.length < 2) { setOrderResults([]); return; }
    const { data } = await radiologyOrdersAPI.list({ search: q });
    const arr = (Array.isArray(data) ? data : data.results || []).filter(o => !o.result);
    setOrderResults(arr);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) { toast.error('Select an order first'); return; }
    if (!form.findings.trim() || !form.impression.trim()) { toast.error('Findings and impression are required'); return; }
    setSaving(true);
    try {
      await radiologyResultsAPI.create({ order: selectedOrder.id, ...form });
      toast.success('Scan result saved');
      onNavigate('pending_scans');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Enter Scan Result</h1></div>
        <button className="btn btn-outline-muted btn-md" onClick={() => onNavigate('pending_scans')}><i className="bi bi-arrow-left" /> Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>
            <i className="bi bi-radioactive" style={{ marginRight: 6 }} />Select Radiology Order
          </div>
          {selectedOrder ? (
            <div style={{ padding: '12px 16px', background: 'var(--color-primary-50)', borderRadius: 10, border: '1px solid var(--color-primary-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{selectedOrder.tariff_name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{selectedOrder.patient_name} · {selectedOrder.patient_number}</div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSelectedOrder(null); setOrderQuery(''); }}>Change</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <SearchInput value={orderQuery} onChange={searchOrders} onClear={() => { setOrderQuery(''); setOrderResults([]); }} placeholder="Search patient or study…" />
              {orderResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', zIndex: 100 }}>
                  {orderResults.map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setOrderQuery(`${o.tariff_name} — ${o.patient_name}`); setOrderResults([]); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4F3'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <span style={{ fontWeight: 600 }}>{o.tariff_name}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{o.patient_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>
            <i className="bi bi-file-earmark-text" style={{ marginRight: 6 }} />Radiology Report
          </div>
          <Field label="Findings" required>
            <textarea className="form-control" value={form.findings} onChange={set('findings')} rows={6} placeholder="Describe the imaging findings in detail…" />
          </Field>
          <Field label="Impression / Conclusion" required>
            <textarea className="form-control" value={form.impression} onChange={set('impression')} rows={4} placeholder="Radiological impression / diagnostic conclusion…" />
          </Field>
          <Field label="Image URL" hint="Link to PACS or image archive (optional)">
            <input className="form-control" value={form.image_url} onChange={set('image_url')} placeholder="https://pacs.hospital.ke/…" />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline-muted btn-md" onClick={() => onNavigate('pending_scans')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-md" disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : <><i className="bi bi-check2" /> Save Report</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── All Radiology Orders ──────────────────────────────────────────────────────
function RadiologyOrdersPage({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    radiologyOrdersAPI.list({ search, status: statusFilter || undefined })
      .then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Study',   render: r => <span style={{ fontWeight: 600 }}>{r.tariff_name}</span> },
    { label: 'Patient', key: 'patient_name' },
    { label: 'Pt. No',  render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Status',  render: r => <StatusBadge status={r.status} /> },
    { label: 'Ordered', render: r => timeAgo(r.ordered_at) },
    { label: 'Result',  render: r => r.result ? <span className="badge badge-success"><i className="bi bi-check2" /> Available</span> : '—' },
    { label: '',        render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">All Radiology Orders</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('enter_scan_results')}><i className="bi bi-pencil-square" /> Enter Result</button>
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patient or study…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','scheduled','performed','resulted'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={orders} loading={loading} onRowClick={setSelected} emptyIcon="bi-radioactive" />
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.tariff_name} size="md" icon="bi-radioactive">
        {selected && (
          <div>
            <DetailRow label="Patient"       value={selected.patient_name} />
            <DetailRow label="Patient No"    value={selected.patient_number} />
            <DetailRow label="Ordered By"    value={selected.ordered_by_name} />
            <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>
            <DetailRow label="Clinical Info" value={selected.clinical_info || '—'} />
            {selected.result && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Radiology Report</div>
                <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 600 }}>Findings: </span>{selected.result.findings}</div>
                <div className="result-block result-normal">{selected.result.impression}</div>
                {selected.result.image_url && <div style={{ marginTop: 8 }}><a href={selected.result.image_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><i className="bi bi-image" /> View Images</a></div>}
                <DetailRow label="Performed By" value={selected.result.performed_by_name} />
                <DetailRow label="Reported At"  value={formatDateTime(selected.result.resulted_at)} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── All Results ───────────────────────────────────────────────────────────────
function RadiologyResultsPage({ onNavigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    radiologyResultsAPI.list()
      .then(r => setResults(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { label: 'Order',      render: r => r.order },
    { label: 'Impression', render: r => r.impression?.substring(0, 60) + (r.impression?.length > 60 ? '…' : '') },
    { label: 'By',         key: 'performed_by_name' },
    { label: 'Date',       render: r => formatDateTime(r.resulted_at) },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">All Radiology Results</h1></div>
      <div className="card">
        <DataTable columns={cols} data={results} loading={loading} onRowClick={setSelected} emptyIcon="bi-file-earmark-x" />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Radiology Report" size="md" icon="bi-file-earmark-check">
        {selected && (
          <div>
            <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 600 }}>Findings: </span>{selected.findings}</div>
            <div className="result-block result-normal" style={{ marginBottom: 12 }}>{selected.impression}</div>
            {selected.image_url && <div style={{ marginBottom: 12 }}><a href={selected.image_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><i className="bi bi-image" /> View Images</a></div>}
            <DetailRow label="Performed By" value={selected.performed_by_name} />
            <DetailRow label="Reported At"  value={formatDateTime(selected.resulted_at)} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function RadiologyDashboard({ activePage, onNavigate }) {
  const [ctx, setCtx] = useState(null);
  const navigate = (page, data = null) => { setCtx(data); onNavigate(page); };

  switch (activePage) {
    case 'pending_scans':       return <PendingScansPage      onNavigate={navigate} />;
    case 'enter_scan_results':  return <EnterScanResultsPage  onNavigate={navigate} preselectedOrder={ctx} />;
    case 'radiology_orders':    return <RadiologyOrdersPage   onNavigate={navigate} />;
    case 'radiology_results':   return <RadiologyResultsPage  onNavigate={navigate} />;
    case 'patients_list':       return <div className="page-header"><h1 className="page-title">Patients</h1></div>;
    default:                    return <RadDashboardPage       onNavigate={navigate} />;
  }
}