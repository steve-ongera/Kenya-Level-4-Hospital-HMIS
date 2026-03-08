/**
 * pages/radiology/RadiologyDashboard.jsx
 * Pending scans queue + Enter scan results
 */

import { useState, useEffect } from 'react';
import { radiologyService } from '../../services/api';
import {
  StatCard, SectionHeader, Card, Button, Badge,
  Input, Select, Textarea, Table, Alert,
} from '../../components/ui';

// ─── Pending Scans ────────────────────────────────────────────────────────────
function PendingScansPage({ onNavigate, onSelectOrder }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    radiologyService.orders.pending()
      .then(r => { setOrders(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <SectionHeader
        title="Pending Radiology Scans"
        sub="Scan orders awaiting imaging"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>}
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Pending"   value={orders.filter(o => o.status === 'pending').length}   icon="⏳" color="#4E342E" />
        <StatCard label="Scheduled" value={orders.filter(o => o.status === 'scheduled').length} icon="📅" color="#D48C10" />
        <StatCard label="Total"     value={orders.length}                                        icon="🩻" color="#006064" />
      </div>

      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'patient_name',   label: 'Patient' },
            { key: 'patient_number', label: 'Patient ID',
              render: v => <span className="patient-id">{v}</span> },
            { key: 'tariff_name',    label: 'Scan Type' },
            { key: 'tariff_price',   label: 'Fee',
              render: v => v ? `KES ${parseFloat(v).toLocaleString()}` : '—' },
            { key: 'status',         label: 'Status',
              render: v => (
                <Badge color={v === 'scheduled' ? 'info' : v === 'performed' ? 'warning' : 'muted'}>
                  {v}
                </Badge>
              ),
            },
            { key: 'ordered_by_name',label: 'Ordered By' },
            { key: 'clinical_info',  label: 'Clinical Info',
              render: v => v
                ? <span style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                : '—',
            },
            { key: 'ordered_at',     label: 'Ordered',
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

// ─── Enter Scan Results ───────────────────────────────────────────────────────
function EnterScanResultsPage({ selectedOrder, onNavigate }) {
  const [form, setForm] = useState({
    findings:     '',
    impression:   '',
    image_url:    '',
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!selectedOrder) { setError('No scan order selected.'); return; }
    if (!form.findings.trim()) { setError('Findings are required.'); return; }
    if (!form.impression.trim()) { setError('Impression / Conclusion is required.'); return; }
    setSaving(true); setError('');
    try {
      await radiologyService.results.create({
        order:      selectedOrder.id,
        findings:   form.findings,
        impression: form.impression,
        image_url:  form.image_url,
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
        <div style={{ fontSize: 40, marginBottom: 12 }}>🩻</div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>No scan order selected.</p>
        <Button variant="primary" onClick={() => onNavigate('pending')}>Back to Pending Scans</Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card style={{ textAlign: 'center', padding: 48, maxWidth: 460 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Scan Results Submitted!</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Results for <strong>{selectedOrder.tariff_name}</strong> have been saved.<br />
          The doctor can now review findings and resume the consultation.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="outline" onClick={() => onNavigate('pending')}>Back to Queue</Button>
          <Button variant="primary" onClick={() => {
            setDone(false);
            setForm({ findings: '', impression: '', image_url: '' });
          }}>
            Next Scan
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Enter Radiology Results"
        sub={`${selectedOrder.patient_name} · ${selectedOrder.tariff_name}`}
      />

      {error && <Alert type="danger">{error}</Alert>}

      {/* Scan info bar */}
      <Card style={{ marginBottom: 16, background: '#F3E5F5', border: '1px solid #CE93D8' }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Patient</div>
            <div style={{ fontWeight: 700 }}>{selectedOrder.patient_name}</div>
            <span className="patient-id">{selectedOrder.patient_number}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Scan</div>
            <div style={{ fontWeight: 700 }}>{selectedOrder.tariff_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ordered By</div>
            <div>{selectedOrder.ordered_by_name}</div>
          </div>
          {selectedOrder.clinical_info && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Clinical Info</div>
              <div style={{ fontSize: 13 }}>{selectedOrder.clinical_info}</div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid-2">
        {/* Findings form */}
        <Card>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>🩻 Scan Report</h4>

          <Textarea
            label="Findings"
            value={form.findings}
            onChange={f('findings')}
            rows={7}
            required
            placeholder={`Describe imaging findings in detail.\n\nE.g.:\nThe lungs are clear bilaterally. No consolidation, effusion or pneumothorax.\nCardiac silhouette is within normal limits.\nCostophrenic angles are sharp.`}
          />

          <Textarea
            label="Impression / Conclusion"
            value={form.impression}
            onChange={f('impression')}
            rows={4}
            required
            placeholder="Summarise the clinical impression and diagnosis.\n\nE.g.: Normal chest X-ray. No acute cardiopulmonary disease."
          />

          <Input
            label="Image URL (PACS / Upload Link)"
            value={form.image_url}
            onChange={f('image_url')}
            placeholder="https://pacs.hospital.ke/study/…"
            hint="Optional — link to digital image in PACS system"
          />
        </Card>

        {/* Preview */}
        <Card>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>📋 Report Preview</h4>

          <div style={{
            background: '#0A2E2A', borderRadius: 10, padding: 20, marginBottom: 16,
            minHeight: 280, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#7FFFD4', lineHeight: 1.8,
          }}>
            <div style={{ color: 'rgba(127,255,212,0.6)', marginBottom: 8, fontSize: 11 }}>
              ─── RADIOLOGY REPORT ───────────────────────
            </div>
            <div><span style={{ color: 'rgba(127,255,212,0.5)' }}>Patient: </span>{selectedOrder.patient_name}</div>
            <div><span style={{ color: 'rgba(127,255,212,0.5)' }}>Exam:    </span>{selectedOrder.tariff_name}</div>
            <div><span style={{ color: 'rgba(127,255,212,0.5)' }}>Date:    </span>{new Date().toLocaleDateString('en-KE')}</div>
            <div style={{ color: 'rgba(127,255,212,0.6)', margin: '10px 0 4px', fontSize: 11 }}>─── FINDINGS ───────────────────────────────</div>
            <div style={{ whiteSpace: 'pre-wrap', color: form.findings ? '#7FFFD4' : 'rgba(127,255,212,0.3)' }}>
              {form.findings || 'Findings will appear here…'}
            </div>
            <div style={{ color: 'rgba(127,255,212,0.6)', margin: '10px 0 4px', fontSize: 11 }}>─── IMPRESSION ─────────────────────────────</div>
            <div style={{ whiteSpace: 'pre-wrap', color: form.impression ? '#FFD700' : 'rgba(127,255,212,0.3)' }}>
              {form.impression || 'Impression will appear here…'}
            </div>
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
export default function RadiologyDashboard({ activePage, onNavigate }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  switch (activePage) {
    case 'pending': return <PendingScansPage    onNavigate={onNavigate} onSelectOrder={setSelectedOrder} />;
    case 'results': return <EnterScanResultsPage selectedOrder={selectedOrder} onNavigate={onNavigate} />;
    default:
      return (
        <div>
          <SectionHeader title="Radiology Dashboard" />
          <div className="grid-stats" style={{ marginBottom: 20 }}>
            <StatCard label="Pending Scans"  value="–" icon="🩻" color="#4E342E" sub="Awaiting imaging" />
            <StatCard label="Resulted Today" value="–" icon="✅" color="#198754" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" icon="🩻" onClick={() => onNavigate('pending')}>View Pending Scans</Button>
          </div>
        </div>
      );
  }
}