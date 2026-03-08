/**
 * pages/pharmacy/PharmacyDashboard.jsx
 */

import { useState, useEffect, useCallback } from 'react';
import { prescriptionsAPI, drugsAPI, dashboardAPI } from '../../services/api';
import {
  StatCard, DataTable, Modal, SearchInput, StatusBadge, Loading,
  toast, formatDate, formatDateTime, Field, SectionTitle, DetailRow, timeAgo,
  formatKES, ConfirmDialog
} from '../../components/ui/index.jsx';

// ── Dashboard ─────────────────────────────────────────────────────────────────
function PharmacyDashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    Promise.all([dashboardAPI.getStats(), prescriptionsAPI.pending()])
      .then(([s, q]) => { setStats(s.data); setQueue(Array.isArray(q.data) ? q.data : q.data.results || []); })
      .catch(() => toast.error('Failed to load'));
  }, []);

  const dispense = async (id) => {
    try { await prescriptionsAPI.dispense(id); toast.success('Dispensed'); setQueue(prev => prev.filter(r => r.id !== id)); }
    catch { toast.error('Failed to dispense'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Pharmacy Dashboard</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => onNavigate('dispensing_queue')}>
          <i className="bi bi-bag-check" /> Dispensing Queue ({queue.length})
        </button>
      </div>
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="bi-capsule"                 iconBg="#FFEBEE" iconColor="#BF360C"               value={stats?.pending_pharmacy}  label="Pending Dispensing" subColor="var(--color-danger)" />
        <StatCard icon="bi-exclamation-triangle-fill" iconBg="#FDEEEE" iconColor="var(--color-danger)"   value={stats?.low_stock_drugs}   label="Low Stock Drugs" subColor="var(--color-danger)" />
        <StatCard icon="bi-people-fill"             iconBg="#E8F5F3" iconColor="var(--color-primary)"  value={stats?.today_visits}       label="Today's Visits" />
        <StatCard icon="bi-check2-circle"           iconBg="#E8F5EC" iconColor="var(--color-success)"  value={stats?.discharged_today}   label="Discharged Today" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><i className="bi bi-bag-check" style={{ marginRight: 6, color: '#BF360C' }} />Next to Dispense ({queue.length})</h3>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dispensing_queue')}>View All</button>
        </div>
        {queue.slice(0, 6).map((rx, i) => (
          <div key={rx.id} className="queue-item">
            <div className="queue-number" style={{ background: '#BF360C' }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{rx.patient_name}</span>
              <span className="patient-id" style={{ marginLeft: 8 }}>{rx.patient_number}</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {rx.items?.length || 0} items · {timeAgo(rx.prescribed_at)}
              </div>
            </div>
            <button className="btn btn-success btn-sm" onClick={() => dispense(rx.id)}>
              <i className="bi bi-bag-check" /> Dispense
            </button>
          </div>
        ))}
        {queue.length === 0 && <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><p>No pending prescriptions</p></div>}
      </div>
    </div>
  );
}

// ── Dispensing Queue ──────────────────────────────────────────────────────────
function DispensingQueuePage({ onNavigate }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    prescriptionsAPI.pending()
      .then(r => setQueue(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const dispense = async (id) => {
    try { await prescriptionsAPI.dispense(id); toast.success('Prescription dispensed'); load(); }
    catch { toast.error('Failed to dispense'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Dispensing Queue</h1><p className="page-subtitle">{queue.length} prescriptions waiting · auto-refreshes every 20s</p></div>
        <button className="btn btn-outline btn-md" onClick={load}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      </div>
      {loading && queue.length === 0 ? <Loading /> : queue.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><i className="bi bi-check2-all" /></div><h4>All Clear!</h4><p>No prescriptions pending dispensing.</p></div></div>
      ) : queue.map((rx, i) => (
        <div key={rx.id} className="card card-sm" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#BF360C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{rx.patient_name} <span className="patient-id">{rx.patient_number}</span></div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {rx.items?.length || 0} items · By {rx.prescribed_by_name} · {timeAgo(rx.prescribed_at)}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {rx.items?.slice(0, 4).map(it => (
                  <span key={it.id} className="badge badge-muted">{it.drug_name} {it.drug_strength} × {it.quantity}</span>
                ))}
                {rx.items?.length > 4 && <span className="badge badge-muted">+{rx.items.length - 4} more</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={rx.status} />
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(rx)}><i className="bi bi-eye" /></button>
              <button className="btn btn-success btn-sm" onClick={() => dispense(rx.id)}>
                <i className="bi bi-bag-check" /> Dispense
              </button>
            </div>
          </div>
        </div>
      ))}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Prescription — ${selected?.patient_name}`} size="md" icon="bi-capsule">
        {selected && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <StatusBadge status={selected.status} />
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>By {selected.prescribed_by_name} · {timeAgo(selected.prescribed_at)}</span>
            </div>
            <DataTable columns={[
              { label: 'Drug',     render: r => <span style={{ fontWeight: 600 }}>{r.drug_name}</span> },
              { label: 'Strength', key: 'drug_strength' },
              { label: 'Dose',     key: 'dose' },
              { label: 'Freq',     key: 'frequency' },
              { label: 'Duration', key: 'duration' },
              { label: 'Qty',      key: 'quantity' },
              { label: 'Instructions', key: 'instructions' },
            ]} data={selected.items || []} loading={false} />
            {selected.notes && <div className="alert alert-info" style={{ marginTop: 12 }}><i className="bi bi-info-circle" /> {selected.notes}</div>}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-success btn-md" style={{ width: '100%' }} onClick={() => { dispense(selected.id); setSelected(null); }}>
                <i className="bi bi-bag-check" /> Confirm Dispense All Items
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── All Prescriptions ─────────────────────────────────────────────────────────
function PrescriptionsPage({ onNavigate }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    prescriptionsAPI.list({ search, status: filter || undefined })
      .then(r => setPrescriptions(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { label: 'Patient',    key: 'patient_name' },
    { label: 'Patient No', render: r => <span className="patient-id">{r.patient_number}</span> },
    { label: 'Items',      render: r => r.items?.length || 0 },
    { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
    { label: 'Prescribed', render: r => timeAgo(r.prescribed_at) },
    { label: 'Dispensed',  render: r => r.dispensed_at ? timeAgo(r.dispensed_at) : '—' },
    { label: 'Dispensed By', key: 'dispensed_by_name' },
    { label: '',           render: r => <button className="btn btn-ghost btn-icon-sm" onClick={() => setSelected(r)}><i className="bi bi-eye" /></button> },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">All Prescriptions</h1></div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search patient, visit…" style={{ flex: 1 }} />
        <select className="form-control" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','partial','dispensed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
      </div>
      <div className="card">
        <DataTable columns={cols} data={prescriptions} loading={loading} onRowClick={setSelected} emptyIcon="bi-capsule" />
      </div>
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Rx — ${selected?.patient_name}`} size="md" icon="bi-capsule">
        {selected && (
          <div>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={selected.status} />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>By {selected.prescribed_by_name}</span>
            </div>
            <DataTable columns={[
              { label: 'Drug',      render: r => <b>{r.drug_name}</b> },
              { label: 'Strength',  key: 'drug_strength' },
              { label: 'Dose',      key: 'dose' },
              { label: 'Frequency', key: 'frequency' },
              { label: 'Duration',  key: 'duration' },
              { label: 'Qty',       key: 'quantity' },
              { label: '✓',         render: r => r.is_dispensed ? <span className="badge badge-success">Done</span> : <span className="badge badge-warning">Pending</span> },
            ]} data={selected.items || []} loading={false} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Drug Inventory ────────────────────────────────────────────────────────────
function InventoryPage({ mode }) {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDrug, setEditDrug] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    name: '', generic_name: '', category: 'other', formulation: 'Tablet',
    strength: '', unit: 'Tablet', stock_quantity: 0, reorder_level: 50,
    unit_price: 0, expiry_date: '', batch_number: '', supplier: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    const call = mode === 'low_stock' ? drugsAPI.lowStock() : mode === 'expiring' ? drugsAPI.expiringSoon() : drugsAPI.list({ search, category: catFilter || undefined });
    call.then(r => setDrugs(Array.isArray(r.data) ? r.data : r.data.results || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [mode, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ name: '', generic_name: '', category: 'other', formulation: 'Tablet', strength: '', unit: 'Tablet', stock_quantity: 0, reorder_level: 50, unit_price: 0, expiry_date: '', batch_number: '', supplier: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openEdit = (d) => {
    setEditDrug(d);
    setForm({ name: d.name, generic_name: d.generic_name || '', category: d.category, formulation: d.formulation, strength: d.strength, unit: d.unit, stock_quantity: d.stock_quantity, reorder_level: d.reorder_level, unit_price: d.unit_price, expiry_date: d.expiry_date || '', batch_number: d.batch_number || '', supplier: d.supplier || '' });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editDrug) { await drugsAPI.update(editDrug.id, form); toast.success('Drug updated'); }
      else          { await drugsAPI.create(form);               toast.success('Drug added to inventory'); }
      setShowForm(false); setEditDrug(null); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
  };

  const handleDelete = async () => {
    try { await drugsAPI.delete(confirmDelete.id); toast.success('Drug deleted'); setConfirmDelete(null); load(); }
    catch { toast.error('Cannot delete — drug may be in use'); }
  };

  const cols = [
    { label: 'Drug', render: r => (
      <div>
        <span style={{ fontWeight: 600 }}>{r.name}</span>
        {r.generic_name && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.generic_name}</div>}
        {r.is_low_stock && <span className="badge badge-warning" style={{ marginLeft: 0, marginTop: 3 }}>Low Stock</span>}
        {r.is_expired   && <span className="badge badge-danger"  style={{ marginLeft: 4, marginTop: 3 }}>Expired</span>}
      </div>
    )},
    { label: 'Category',  render: r => <span className="badge badge-muted">{r.category}</span> },
    { label: 'Form',      key: 'formulation' },
    { label: 'Strength',  key: 'strength' },
    { label: 'Stock',     render: r => <span style={{ fontWeight: 700, color: r.is_low_stock ? 'var(--color-danger)' : r.stock_quantity > r.reorder_level * 2 ? 'var(--color-success)' : 'var(--color-warning)' }}>{r.stock_quantity} {r.unit}s</span> },
    { label: 'Reorder',   render: r => `≤ ${r.reorder_level}` },
    { label: 'Unit Price',render: r => formatKES(r.unit_price) },
    { label: 'Expiry',    render: r => <span style={{ color: r.is_expired ? 'var(--color-danger)' : 'inherit', fontWeight: r.is_expired ? 700 : 400 }}>{formatDate(r.expiry_date)}</span> },
    { label: '',          render: r => (
      <div className="table-actions">
        <button className="btn btn-ghost btn-icon-sm" title="Edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" /></button>
        <button className="btn btn-ghost btn-icon-sm" title="Delete" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(r)}><i className="bi bi-trash" /></button>
      </div>
    )},
  ];

  const pageTitle = mode === 'low_stock' ? 'Low Stock Drugs' : mode === 'expiring' ? 'Expiring Soon' : 'Drug Inventory';

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">{pageTitle}</h1></div>
        <button className="btn btn-primary btn-md" onClick={() => { resetForm(); setEditDrug(null); setShowForm(true); }}>
          <i className="bi bi-plus" /> Add Drug
        </button>
      </div>

      {mode === 'inventory' && (
        <div className="filter-bar">
          <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search drugs…" style={{ flex: 1 }} />
          <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {['antibiotic','analgesic','antimalaria','antidiabetic','antihyp','supplement','infusion','other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
        </div>
      )}

      <div className="card">
        <DataTable columns={cols} data={drugs} loading={loading} emptyIcon="bi-capsule" emptyText={`No ${pageTitle.toLowerCase()}`} />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editDrug ? `Edit: ${editDrug.name}` : 'Add New Drug'} size="lg" icon="bi-capsule-pill"
        footer={
          <><button className="btn btn-outline-muted btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" form="drugForm" type="submit"><i className="bi bi-check2" /> {editDrug ? 'Update' : 'Add Drug'}</button></>
        }>
        <form id="drugForm" onSubmit={handleSave}>
          <div className="form-row-2">
            <Field label="Drug Name" required><input className="form-control" value={form.name} onChange={set('name')} required /></Field>
            <Field label="Generic Name"><input className="form-control" value={form.generic_name} onChange={set('generic_name')} /></Field>
          </div>
          <div className="form-row-3">
            <Field label="Category">
              <select className="form-control" value={form.category} onChange={set('category')}>
                {['antibiotic','analgesic','antimalaria','antidiabetic','antihyp','supplement','infusion','other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Formulation"><input className="form-control" value={form.formulation} onChange={set('formulation')} placeholder="Tablet, Syrup, Injection…" /></Field>
            <Field label="Strength"><input className="form-control" value={form.strength} onChange={set('strength')} placeholder="e.g. 500mg" /></Field>
          </div>
          <div className="form-row-3">
            <Field label="Unit" hint="e.g. Tablet, Vial"><input className="form-control" value={form.unit} onChange={set('unit')} /></Field>
            <Field label="Stock Qty"><input type="number" className="form-control" value={form.stock_quantity} onChange={set('stock_quantity')} min="0" /></Field>
            <Field label="Reorder Level"><input type="number" className="form-control" value={form.reorder_level} onChange={set('reorder_level')} min="0" /></Field>
          </div>
          <div className="form-row-3">
            <Field label="Unit Price (KES)"><input type="number" className="form-control" value={form.unit_price} onChange={set('unit_price')} step="0.01" min="0" /></Field>
            <Field label="Expiry Date"><input type="date" className="form-control" value={form.expiry_date} onChange={set('expiry_date')} /></Field>
            <Field label="Batch No"><input className="form-control" value={form.batch_number} onChange={set('batch_number')} /></Field>
          </div>
          <Field label="Supplier"><input className="form-control" value={form.supplier} onChange={set('supplier')} /></Field>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!confirmDelete} danger title="Delete Drug"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function PharmacyDashboard({ activePage, onNavigate }) {
  const navigate = (page) => onNavigate(page);
  switch (activePage) {
    case 'dispensing_queue': return <DispensingQueuePage onNavigate={navigate} />;
    case 'prescriptions':    return <PrescriptionsPage   onNavigate={navigate} />;
    case 'inventory':        return <InventoryPage mode="inventory" onNavigate={navigate} />;
    case 'low_stock':        return <InventoryPage mode="low_stock" onNavigate={navigate} />;
    case 'expiring':         return <InventoryPage mode="expiring"  onNavigate={navigate} />;
    default:                 return <PharmacyDashboardPage onNavigate={navigate} />;
  }
}