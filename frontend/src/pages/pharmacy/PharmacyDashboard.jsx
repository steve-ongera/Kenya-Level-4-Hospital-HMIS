/**
 * pages/pharmacy/PharmacyDashboard.jsx
 * Dispensing queue, dispense medicine, drug inventory
 */

import { useState, useEffect } from 'react';
import { prescriptionService, drugService, dashboardService } from '../../services/api';
import {
  StatCard, SectionHeader, Card, Button, Badge,
  Input, Select, Textarea, Table, Alert,
} from '../../components/ui';

// ─── Dispensing Queue ─────────────────────────────────────────────────────────
function DispensingQueuePage({ onNavigate, onSelectRx }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    prescriptionService.pending()
      .then(r => { setItems(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <SectionHeader
        title="Dispensing Queue"
        sub="Prescriptions pending dispensing"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>}
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Pending"   value={items.filter(i => i.status === 'pending').length}  icon="📋" color="#BF360C" />
        <StatCard label="Partial"   value={items.filter(i => i.status === 'partial').length}  icon="⚠️" color="#D48C10" />
        <StatCard label="Total Queue" value={items.length}                                    icon="💊" color="#006064" />
      </div>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'visit_number',      label: 'Visit No.',
              render: v => <span className="patient-id">{v}</span> },
            { key: 'patient_name',      label: 'Patient' },
            { key: 'patient_number',    label: 'Patient ID',
              render: v => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{v}</span> },
            { key: 'prescribed_by_name',label: 'Doctor' },
            { key: 'status',            label: 'Status',
              render: v => <Badge color={v === 'pending' ? 'warning' : 'info'}>{v}</Badge> },
            { key: 'prescribed_at',     label: 'Time',
              render: v => v ? new Date(v).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—' },
          ]}
          data={items}
          actions={row => (
            <Button
              size="sm"
              variant="primary"
              onClick={() => { onSelectRx(row); onNavigate('dispense'); }}
            >
              Dispense
            </Button>
          )}
        />
      </Card>
    </div>
  );
}

// ─── Dispense Medicine ─────────────────────────────────────────────────────────
function DispensePage({ selectedRx, onNavigate }) {
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  const dispense = async () => {
    if (!selectedRx) return;
    setSaving(true); setError('');
    try {
      await prescriptionService.dispense(selectedRx.id);
      setDone(true);
    } catch {
      setError('Failed to process dispensing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedRx) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>No prescription selected.</p>
        <Button variant="primary" onClick={() => onNavigate('dispensing')}>Back to Queue</Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card style={{ textAlign: 'center', padding: 48, maxWidth: 460 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Medicines Dispensed!</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
          <strong>{selectedRx.patient_name}</strong> has received all medicines.<br />
          Patient is now <strong>free to go home</strong>.
        </p>
        <div style={{ background: 'var(--color-success-bg)', borderRadius: 8, padding: '12px 20px', marginBottom: 20, border: '1px solid #B8DDD8' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>VISIT</div>
          <span className="patient-id">{selectedRx.visit_number}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="outline" onClick={() => onNavigate('dispensing')}>Back to Queue</Button>
          <Button variant="primary" onClick={() => { onNavigate('dispensing'); }}>Next Patient</Button>
        </div>
      </Card>
    );
  }

  const items = selectedRx.items || [];

  return (
    <div>
      <SectionHeader
        title="Dispense Medicines"
        sub={`${selectedRx.patient_name} · ${selectedRx.visit_number}`}
      />

      {error && <Alert type="danger">{error}</Alert>}

      {/* Patient summary */}
      <Card style={{ marginBottom: 16, borderLeft: '4px solid #BF360C' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Patient</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedRx.patient_name}</div>
            <span className="patient-id">{selectedRx.patient_number}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Prescribed By</div>
            <div style={{ fontWeight: 600 }}>{selectedRx.prescribed_by_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Time</div>
            <div>{selectedRx.prescribed_at ? new Date(selectedRx.prescribed_at).toLocaleString('en-KE') : '—'}</div>
          </div>
        </div>
      </Card>

      <div className="grid-2">
        {/* Prescription items */}
        <Card>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>💊 Items to Dispense</h4>
          {items.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No items found.</p>
          ) : (
            items.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  marginBottom: 10,
                  background: '#FAFCFB',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.drug_name} {item.drug_strength}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Dose: <strong>{item.dose}</strong> · Frequency: <strong>{item.frequency}</strong> · Duration: <strong>{item.duration}</strong>
                    </div>
                    {item.instructions && (
                      <div style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4 }}>
                        📋 {item.instructions}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>
                      ×{item.quantity}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      KES {parseFloat(item.unit_price || 0) * item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 16 }}>
            <Button
              variant="success"
              fullWidth
              size="lg"
              icon="✅"
              onClick={dispense}
              disabled={saving}
            >
              {saving ? 'Processing…' : 'Confirm All Dispensed — Patient May Go Home'}
            </Button>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📝 Prescription Notes</h4>
          <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, minHeight: 80 }}>
            {selectedRx.notes || <span style={{ color: 'var(--color-text-muted)' }}>No additional notes.</span>}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Billing Summary
            </div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{item.drug_name} ×{item.quantity}</span>
                <span>KES {(parseFloat(item.unit_price || 0) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14 }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>
                KES {items.reduce((sum, i) => sum + (parseFloat(i.unit_price || 0) * i.quantity), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Drug Inventory ───────────────────────────────────────────────────────────
function DrugInventoryPage() {
  const [drugs,   setDrugs]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    drugService.list()
      .then(r => { setDrugs(r.data.results || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = drugs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.generic_name || '').toLowerCase().includes(search.toLowerCase());
    if (filter === 'low')     return matchSearch && d.is_low_stock;
    if (filter === 'expired') return matchSearch && d.is_expired;
    return matchSearch;
  });

  return (
    <div>
      <SectionHeader title="Drug Inventory" sub="Current stock levels" />

      <div className="grid-stats" style={{ marginBottom: 16 }}>
        <StatCard label="Total Drugs"  value={drugs.length}                             icon="💊" color="#BF360C" />
        <StatCard label="Low Stock"    value={drugs.filter(d => d.is_low_stock).length} icon="⚠️" color="#D48C10" sub="Needs reorder" />
        <StatCard label="Expired"      value={drugs.filter(d => d.is_expired).length}   icon="❌" color="#DC3545" sub="Remove from shelf" />
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <Input
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Drug name or generic name…"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Select
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all',     label: 'All Drugs' },
              { value: 'low',     label: 'Low Stock Only' },
              { value: 'expired', label: 'Expired Only' },
            ]}
            style={{ width: 180, marginBottom: 0 }}
          />
        </div>
      </Card>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'name',          label: 'Drug Name',
              render: (v, r) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                  {r.generic_name && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.generic_name}</div>}
                </div>
              ),
            },
            { key: 'strength',      label: 'Strength' },
            { key: 'formulation',   label: 'Form' },
            { key: 'category',      label: 'Category' },
            { key: 'stock_quantity',label: 'Stock',
              render: (v, r) => (
                <span style={{ fontWeight: 700, color: r.is_low_stock ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {v}
                </span>
              ),
            },
            { key: 'reorder_level', label: 'Reorder At' },
            { key: 'unit_price',    label: 'Unit Price', render: v => `KES ${parseFloat(v).toFixed(2)}` },
            { key: 'expiry_date',   label: 'Expiry',
              render: (v, r) => v
                ? <span style={{ color: r.is_expired ? 'var(--color-danger)' : 'inherit', fontWeight: r.is_expired ? 700 : 400 }}>{v}</span>
                : '—',
            },
            { key: 'is_low_stock',  label: 'Status',
              render: (v, r) => r.is_expired
                ? <Badge color="danger">Expired</Badge>
                : v
                  ? <Badge color="warning">Low Stock</Badge>
                  : <Badge color="success">OK</Badge>,
            },
          ]}
          data={filtered}
        />
      </Card>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PharmacyDashboard({ activePage, onNavigate }) {
  const [selectedRx, setSelectedRx] = useState(null);

  switch (activePage) {
    case 'dispensing': return <DispensingQueuePage onNavigate={onNavigate} onSelectRx={setSelectedRx} />;
    case 'dispense':   return <DispensePage selectedRx={selectedRx} onNavigate={onNavigate} />;
    case 'inventory':  return <DrugInventoryPage />;
    default:
      return (
        <div>
          <SectionHeader title="Pharmacy Dashboard" />
          <div className="grid-stats" style={{ marginBottom: 20 }}>
            <StatCard label="Pending Dispensing" value="–" icon="📋" color="#BF360C" sub="Click to view" />
            <StatCard label="Drugs in Stock"      value="–" icon="💊" color="#006064" />
            <StatCard label="Low Stock Alerts"    value="–" icon="⚠️" color="#D48C10" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" icon="📋" onClick={() => onNavigate('dispensing')}>Open Dispensing Queue</Button>
            <Button variant="outline" icon="📦" onClick={() => onNavigate('inventory')}>View Drug Inventory</Button>
          </div>
        </div>
      );
  }
}