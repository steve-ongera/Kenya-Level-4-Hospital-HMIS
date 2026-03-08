/**
 * pages/nurse/NurseDashboard.jsx
 * Nurse module: Triage queue + Record Vitals
 */

import { useState, useEffect } from 'react';
import { triageService, visitService, dashboardService } from '../../services/api';
import { StatCard, SectionHeader, Card, Button, Badge, Input, Select, Textarea, Table, Alert, Spinner, VitalBox } from '../../components/ui';

function TriageQueuePage({ onNavigate, onSelectVisit }) {
  const [visits, setVisits]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    triageService.pending()
      .then(r => { setVisits(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <SectionHeader title="Triage Queue" sub="Patients awaiting vitals recording"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>} />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatCard label="Pending Triage" value={visits.length} icon="⏳" color="#D48C10" />
      </div>

      <Card>
        <Table loading={loading}
          columns={[
            { key: 'visit_number',   label: 'Visit No.',  render: v => <span className="patient-id">{v}</span> },
            { key: 'patient_name',   label: 'Patient' },
            { key: 'patient_number', label: 'Patient ID' },
            { key: 'specialist_name',label: 'Specialist' },
            { key: 'check_in_time',  label: 'Check-in',
              render: v => v ? new Date(v).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '—' },
          ]}
          data={visits}
          actions={row => (
            <Button size="sm" variant="primary" onClick={() => { onSelectVisit(row); onNavigate('triage_form'); }}>
              Record Vitals
            </Button>
          )}
        />
      </Card>
    </div>
  );
}

function TriageFormPage({ selectedVisit, onNavigate }) {
  const empty = {
    temperature:'', pulse_rate:'', respiratory_rate:'',
    bp_systolic:'', bp_diastolic:'', oxygen_saturation:'',
    weight:'', height:'',
    blood_sugar:'', presenting_complaint:'', priority:'normal', triage_notes:'',
  };
  const [form, setForm]   = useState(empty);
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!selectedVisit) { setError('No visit selected.'); return; }
    if (!form.presenting_complaint) { setError('Presenting complaint is required.'); return; }
    setSaving(true); setError('');
    try {
      await triageService.create({ ...form, visit: selectedVisit.id });
      setDone(true);
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to save triage.');
    } finally { setSaving(false); }
  };

  if (!selectedVisit) return (
    <Card style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>No visit selected.</p>
      <Button variant="primary" onClick={() => onNavigate('triage_queue')}>Back to Queue</Button>
    </Card>
  );

  if (done) return (
    <Card style={{ textAlign: 'center', padding: 40, maxWidth: 480 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h3>Triage Recorded!</h3>
      <p style={{ color: 'var(--color-text-muted)', margin: '8px 0 20px' }}>
        {selectedVisit.patient_name} has been triaged and queued for doctor consultation.
      </p>
      <Button variant="primary" onClick={() => { onNavigate('triage_queue'); }}>Next Patient</Button>
    </Card>
  );

  return (
    <div>
      <SectionHeader title="Record Vitals" sub={`Patient: ${selectedVisit.patient_name} · ${selectedVisit.visit_number}`} />
      {error && <Alert type="danger">{error}</Alert>}

      <div className="grid-2">
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>🌡️ Vital Signs</h3>
          <div className="form-row">
            <Input label="Temperature (°C)"    value={form.temperature}      onChange={f('temperature')}      type="number" placeholder="36.5" />
            <Input label="Pulse Rate (bpm)"    value={form.pulse_rate}       onChange={f('pulse_rate')}       type="number" placeholder="72" />
            <Input label="Resp. Rate (/min)"   value={form.respiratory_rate} onChange={f('respiratory_rate')} type="number" placeholder="18" />
            <Input label="O₂ Saturation (%)"   value={form.oxygen_saturation}onChange={f('oxygen_saturation')}type="number" placeholder="98" />
            <Input label="BP Systolic (mmHg)"  value={form.bp_systolic}      onChange={f('bp_systolic')}      type="number" placeholder="120" />
            <Input label="BP Diastolic (mmHg)" value={form.bp_diastolic}     onChange={f('bp_diastolic')}     type="number" placeholder="80" />
            <Input label="Weight (kg)"         value={form.weight}           onChange={f('weight')}           type="number" placeholder="70.0" />
            <Input label="Height (cm)"         value={form.height}           onChange={f('height')}           type="number" placeholder="170" />
            <Input label="Blood Sugar (mmol/L)"value={form.blood_sugar}      onChange={f('blood_sugar')}      type="number" placeholder="5.4" />
          </div>

          {(form.weight && form.height) && (
            <div style={{ background: 'var(--color-primary-50)', padding: 12, borderRadius: 8, marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>CALCULATED BMI</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>
                {(parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1)}
              </div>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📋 Assessment</h3>
            <Textarea label="Presenting Complaint" value={form.presenting_complaint} onChange={f('presenting_complaint')} required rows={4}
              placeholder="Chief complaint in patient's own words" />
            <Select label="Triage Priority" value={form.priority} onChange={f('priority')}
              options={[
                { value: 'immediate', label: '🔴 Immediate' },
                { value: 'urgent',    label: '🟠 Urgent' },
                { value: 'normal',    label: '🟢 Normal' },
                { value: 'non_urgent',label: '🔵 Non-Urgent' },
              ]} />
            <Textarea label="Triage Notes" value={form.triage_notes} onChange={f('triage_notes')} rows={3} />
          </Card>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => onNavigate('triage_queue')} fullWidth>← Back</Button>
            <Button variant="primary" icon="💾" onClick={submit} disabled={saving} fullWidth>
              {saving ? 'Saving…' : 'Save Triage'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NurseDashboard({ activePage, onNavigate }) {
  const [selectedVisit, setSelectedVisit] = useState(null);
  switch (activePage) {
    case 'triage_queue': return <TriageQueuePage onNavigate={onNavigate} onSelectVisit={setSelectedVisit} />;
    case 'triage_form':  return <TriageFormPage  selectedVisit={selectedVisit} onNavigate={onNavigate} />;
    default: return (
      <div>
        <SectionHeader title="Nursing Dashboard" />
        <div className="grid-stats">
          <StatCard label="Pending Triage" value="–" icon="⏳" color="#1565C0" />
          <StatCard label="In Triage"      value="–" icon="🩺" color="#1565C0" />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Button variant="primary" icon="⏳" onClick={() => onNavigate('triage_queue')}>Open Triage Queue</Button>
        </div>
      </div>
    );
  }
}