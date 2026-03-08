/**
 * pages/lab/LabDashboard.jsx
 * Pending tests queue + Enter results
 */

import { useState, useEffect } from 'react';
import { labService } from '../../services/api';
import {
  StatCard, SectionHeader, Card, Button, Badge,
  Input, Select, Textarea, Table, Alert, Spinner,
} from '../../components/ui';

// ─── Pending Tests ────────────────────────────────────────────────────────────
function PendingTestsPage({ onNavigate, onSelectOrder }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    labService.orders.pending()
      .then(r => { setOrders(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const urgencyColor = { stat: 'danger', urgent: 'warning', routine: 'muted' };

  return (
    <div>
      <SectionHeader
        title="Pending Lab Tests"
        sub="Tests ordered by doctors awaiting processing"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>}
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="STAT"    value={orders.filter(o => o.urgency === 'stat').length}    icon="🚨" color="#DC3545" />
        <StatCard label="Urgent"  value={orders.filter(o => o.urgency === 'urgent').length}  icon="⚠️" color="#D48C10" />
        <StatCard label="Routine" value={orders.filter(o => o.urgency === 'routine').length} icon="🔬" color="#006064" />
      </div>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'patient_name',   label: 'Patient' },
            { key: 'patient_number', label: 'Patient ID',
              render: v => <span className="patient-id">{v}</span> },
            { key: 'tariff_name',    label: 'Test Name' },
            { key: 'tariff_price',   label: 'Fee',
              render: v => v ? `KES ${parseFloat(v).toLocaleString()}` : '—' },
            { key: 'urgency',        label: 'Urgency',
              render: v => <Badge color={urgencyColor[v] || 'muted'}>{v?.toUpperCase()}</Badge> },
            { key: 'status',         label: 'Status',
              render: v => <Badge color={v === 'collected' ? 'info' : v === 'processing' ? 'warning' : 'muted'}>{v}</Badge> },
            { key: 'ordered_by_name',label: 'Ordered By' },
            { key: 'ordered_at',     label: 'Time',
              render: v => v ? new Date(v).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—' },
          ]}
          data={orders}
          actions={row => (
            <Button
              size="sm"
              variant="primary"
              onClick={() => { onSelectOrder(row); onNavigate('results'); }}
            >
              Enter Results
            </Button>
          )}
        />
      </Card>
    </div>
  );
}

// ─── Enter Results ────────────────────────────────────────────────────────────
function EnterResultsPage({ selectedOrder, onNavigate }) {
  const [form, setForm] = useState({
    result_text:    '',
    interpretation: 'normal',
    reference_range:'',
    comments:       '',
    result_values:  {},
  });
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!selectedOrder) { setError('No test selected.'); return; }
    if (!form.result_text.trim()) { setError('Result text is required.'); return; }
    setSaving(true); setError('');
    try {
      await labService.results.create({
        order:          selectedOrder.id,
        result_text:    form.result_text,
        interpretation: form.interpretation,
        reference_range:form.reference_range,
        comments:       form.comments,
      });
      setDone(true);
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to save results.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedOrder) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>No test order selected.</p>
        <Button variant="primary" onClick={() => onNavigate('pending')}>Back to Pending</Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card style={{ textAlign: 'center', padding: 48, maxWidth: 460 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Results Submitted!</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Results for <strong>{selectedOrder.tariff_name}</strong> have been saved.<br />
          The doctor has been notified and the consultation will resume.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="outline" onClick={() => onNavigate('pending')}>Back to Queue</Button>
          <Button variant="primary" onClick={() => { setDone(false); setForm({ result_text:'', interpretation:'normal', reference_range:'', comments:'', result_values:{} }); }}>
            Enter Another
          </Button>
        </div>
      </Card>
    );
  }

  const interpColors = { normal: 'success', abnormal: 'warning', critical: 'danger' };

  return (
    <div>
      <SectionHeader
        title="Enter Lab Results"
        sub={`${selectedOrder.patient_name} · ${selectedOrder.tariff_name}`}
      />

      {error && <Alert type="danger">{error}</Alert>}

      {/* Test info bar */}
      <Card style={{ marginBottom: 16, background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Patient</div>
            <div style={{ fontWeight: 700 }}>{selectedOrder.patient_name}</div>
            <span className="patient-id">{selectedOrder.patient_number}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Test</div>
            <div style={{ fontWeight: 700 }}>{selectedOrder.tariff_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Urgency</div>
            <Badge color={selectedOrder.urgency === 'stat' ? 'danger' : selectedOrder.urgency === 'urgent' ? 'warning' : 'muted'}>
              {selectedOrder.urgency?.toUpperCase()}
            </Badge>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ordered By</div>
            <div>{selectedOrder.ordered_by_name}</div>
          </div>
          {selectedOrder.clinical_notes && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Clinical Notes</div>
              <div style={{ fontSize: 13 }}>{selectedOrder.clinical_notes}</div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid-2">
        <Card>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>📊 Results</h4>

          <Textarea
            label="Result Text"
            value={form.result_text}
            onChange={f('result_text')}
            rows={6}
            required
            placeholder={`Enter ${selectedOrder.tariff_name} results here.\nE.g.:\nHaemoglobin: 12.5 g/dL\nWBC: 8.2 × 10⁹/L\nPlatelets: 250 × 10⁹/L`}
          />

          <Input
            label="Reference Range"
            value={form.reference_range}
            onChange={f('reference_range')}
            placeholder="e.g. Hb: M 13.5–17.5 g/dL, F 12.0–15.5 g/dL"
          />

          <Select
            label="Interpretation"
            value={form.interpretation}
            onChange={f('interpretation')}
            options={[
              { value: 'normal',   label: '✅ Normal' },
              { value: 'abnormal', label: '⚠️ Abnormal' },
              { value: 'critical', label: '🚨 Critical' },
            ]}
          />

          <Textarea
            label="Comments / Remarks"
            value={form.comments}
            onChange={f('comments')}
            rows={2}
            placeholder="Additional comments or recommendations"
          />
        </Card>

        <Card>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>📋 Preview</h4>

          <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: 16, marginBottom: 16, minHeight: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedOrder.tariff_name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedOrder.patient_name}</div>
              </div>
              {form.interpretation && (
                <Badge color={interpColors[form.interpretation]}>{form.interpretation.toUpperCase()}</Badge>
              )}
            </div>
            <pre style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--color-text)', lineHeight: 1.7, margin: 0 }}>
              {form.result_text || <span style={{ color: 'var(--color-text-muted)' }}>Results will appear here…</span>}
            </pre>
            {form.reference_range && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                Ref: {form.reference_range}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => onNavigate('pending')}>← Back</Button>
            <Button
              variant="primary"
              fullWidth
              icon="💾"
              onClick={submit}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Submit Results to Doctor'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function LabDashboard({ activePage, onNavigate }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  switch (activePage) {
    case 'pending': return <PendingTestsPage onNavigate={onNavigate} onSelectOrder={setSelectedOrder} />;
    case 'results': return <EnterResultsPage selectedOrder={selectedOrder} onNavigate={onNavigate} />;
    default:
      return (
        <div>
          <SectionHeader title="Laboratory Dashboard" />
          <div className="grid-stats" style={{ marginBottom: 20 }}>
            <StatCard label="Pending Tests" value="–" icon="🔬" color="#006064" sub="Awaiting processing" />
            <StatCard label="STAT Tests"    value="–" icon="🚨" color="#DC3545" sub="Urgent" />
            <StatCard label="Resulted Today"value="–" icon="✅" color="#198754" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" icon="🔬" onClick={() => onNavigate('pending')}>View Pending Tests</Button>
          </div>
        </div>
      );
  }
}