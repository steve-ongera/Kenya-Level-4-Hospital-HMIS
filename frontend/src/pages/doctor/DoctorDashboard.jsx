/**
 * pages/doctor/DoctorDashboard.jsx
 */
import { useState, useEffect } from 'react';
import { visitService, consultationService, labService, radiologyService, prescriptionService, tariffService, drugService } from '../../services/api';
import { StatCard, SectionHeader, Card, Button, Badge, Input, Select, Textarea, Table, Alert, Tabs } from '../../components/ui';

function MyQueuePage({ onNavigate, onSelectVisit }) {
  const [visits, setVisits] = useState([]);
  useEffect(() => {
    visitService.queue('triage_done').then(r => setVisits(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <SectionHeader title="My Consultation Queue" sub="Patients ready for consultation (triaged)" />
      <Card>
        <Table
          columns={[
            { key: 'visit_number',   label: 'Visit No.',  render: v => <span className="patient-id">{v}</span> },
            { key: 'patient_name',   label: 'Patient' },
            { key: 'specialist_name',label: 'Specialty' },
            { key: 'triage_time',    label: 'Triaged',
              render: v => v ? new Date(v).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '—' },
          ]}
          data={visits}
          actions={row => (
            <Button size="sm" variant="primary" onClick={() => { onSelectVisit(row); onNavigate('consultation'); }}>
              Start Consult
            </Button>
          )}
        />
      </Card>
    </div>
  );
}

function ConsultationPage({ selectedVisit, onNavigate }) {
  const [consult,  setConsult]  = useState(null);
  const [labOrders,setLabOrders]= useState([]);
  const [radOrders,setRadOrders]= useState([]);
  const [tab,      setTab]      = useState('history');
  const [labTariffs, setLabTariffs] = useState([]);
  const [radTariffs, setRadTariffs] = useState([]);
  const [drugs,    setDrugs]    = useState([]);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    chief_complaint:'', history_of_illness:'', physical_examination:'',
    diagnosis:'', icd10_code:'', management_plan:'', doctor_notes:'',
  });
  const [rxItems, setRxItems] = useState([{ drug:'', dose:'', frequency:'', duration:'', quantity:1, instructions:'' }]);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    tariffService.byCategory('lab').then(r => setLabTariffs(r.data.results || r.data)).catch(() => {});
    tariffService.byCategory('radiology').then(r => setRadTariffs(r.data.results || r.data)).catch(() => {});
    drugService.search('').then(r => setDrugs(r.data.results || r.data)).catch(() => {});
  }, []);

  const startConsultation = async () => {
    if (!selectedVisit) return;
    setSaving(true);
    try {
      const { data } = await consultationService.create({ visit: selectedVisit.id, chief_complaint: form.chief_complaint || 'As per triage' });
      setConsult(data);
    } finally { setSaving(false); }
  };

  const saveConsult = async () => {
    if (!consult) return;
    setSaving(true);
    try {
      const updated = await consultationService.update(consult.id, form);
      setConsult(updated.data);
    } finally { setSaving(false); }
  };

  const addLabOrder = async (tariffId) => {
    if (!consult) return;
    await labService.orders.create({ visit: selectedVisit.id, consultation: consult.id, tariff: tariffId });
    const r = await consultationService.getLabResults(consult.id);
    setLabOrders(r.data);
  };

  const addRadOrder = async (tariffId) => {
    if (!consult) return;
    await radiologyService.orders.create({ visit: selectedVisit.id, consultation: consult.id, tariff: tariffId });
    const r = await consultationService.getRadResults(consult.id);
    setRadOrders(r.data);
  };

  const pauseConsult = async () => {
    if (!consult) return;
    await consultationService.pause(consult.id, 'Sent to investigations');
  };

  const writePrescription = async () => {
    if (!consult) return;
    setSaving(true);
    try {
      await prescriptionService.create({
        visit: selectedVisit.id,
        consultation: consult.id,
        items: rxItems.filter(i => i.drug),
      });
      alert('Prescription saved!');
    } finally { setSaving(false); }
  };

  const completeConsult = async () => {
    if (!consult) return;
    await consultationService.complete(consult.id, 'discharge');
    onNavigate('my_queue');
  };

  if (!selectedVisit) return (
    <Card style={{ textAlign: 'center', padding: 40 }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>No visit selected.</p>
      <Button variant="primary" onClick={() => onNavigate('my_queue')}>Back to Queue</Button>
    </Card>
  );

  return (
    <div>
      <SectionHeader title="Consultation" sub={`${selectedVisit.patient_name} · ${selectedVisit.visit_number}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {consult && <Button variant="warning" size="sm" icon="⏸" onClick={pauseConsult}>Pause (Send to Lab/Rad)</Button>}
            {consult && <Button variant="success" size="sm" icon="✅" onClick={completeConsult}>Complete & Discharge</Button>}
          </div>
        }
      />

      {!consult ? (
        <Card style={{ maxWidth: 480 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Begin Consultation</h3>
          <Textarea label="Chief Complaint" value={form.chief_complaint} onChange={f('chief_complaint')} required rows={3} />
          <Button variant="primary" fullWidth onClick={startConsultation} disabled={saving}>
            {saving ? 'Starting…' : 'Start Consultation'}
          </Button>
        </Card>
      ) : (
        <div>
          <Tabs
            tabs={[
              { id: 'history',     label: 'History & Exam', icon: '📋' },
              { id: 'lab',         label: 'Lab Orders',     icon: '🔬', count: labOrders.length },
              { id: 'radiology',   label: 'Radiology',      icon: '🩻', count: radOrders.length },
              { id: 'prescription',label: 'Prescription',   icon: '💊' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'history' && (
            <div className="grid-2">
              <Card>
                <h4 style={{ margin: '0 0 12px' }}>📋 Clinical History</h4>
                <Textarea label="Chief Complaint"      value={form.chief_complaint}      onChange={f('chief_complaint')}      rows={2} />
                <Textarea label="History of Illness"   value={form.history_of_illness}   onChange={f('history_of_illness')}   rows={3} />
                <Textarea label="Physical Examination" value={form.physical_examination} onChange={f('physical_examination')} rows={3} />
              </Card>
              <Card>
                <h4 style={{ margin: '0 0 12px' }}>🏥 Assessment & Plan</h4>
                <Textarea label="Diagnosis"      value={form.diagnosis}      onChange={f('diagnosis')}      rows={2} />
                <Input    label="ICD-10 Code"    value={form.icd10_code}     onChange={f('icd10_code')}     placeholder="e.g. J06.9" />
                <Textarea label="Management Plan"value={form.management_plan}onChange={f('management_plan')}rows={3} />
                <Textarea label="Doctor Notes"   value={form.doctor_notes}   onChange={f('doctor_notes')}   rows={2} />
                <Button variant="primary" fullWidth icon="💾" onClick={saveConsult} disabled={saving} style={{ marginTop: 8 }}>
                  Save Notes
                </Button>
              </Card>
            </div>
          )}

          {tab === 'lab' && (
            <div className="grid-2">
              <Card>
                <h4 style={{ margin: '0 0 14px' }}>Order Lab Test</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {labTariffs.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.code} · KES {parseInt(t.price).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addLabOrder(t.id)}>Order</Button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h4 style={{ margin: '0 0 14px' }}>Ordered Tests</h4>
                <Table columns={[
                  { key: 'tariff_name', label: 'Test' },
                  { key: 'status',      label: 'Status', render: v => <Badge color={v === 'resulted' ? 'success' : 'warning'}>{v}</Badge> },
                ]} data={labOrders} />
                {labOrders.some(o => o.status === 'resulted') &&
                  <Button variant="outline" size="sm" style={{ marginTop: 10 }} onClick={async () => {
                    const r = await consultationService.getLabResults(consult.id);
                    setLabOrders(r.data);
                  }}>Refresh Results</Button>
                }
              </Card>
            </div>
          )}

          {tab === 'radiology' && (
            <div className="grid-2">
              <Card>
                <h4 style={{ margin: '0 0 14px' }}>Order Scan</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {radTariffs.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.code} · KES {parseInt(t.price).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addRadOrder(t.id)}>Order</Button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h4 style={{ margin: '0 0 14px' }}>Ordered Scans</h4>
                <Table columns={[
                  { key: 'tariff_name', label: 'Scan' },
                  { key: 'status',      label: 'Status', render: v => <Badge color={v === 'resulted' ? 'success' : 'warning'}>{v}</Badge> },
                ]} data={radOrders} />
              </Card>
            </div>
          )}

          {tab === 'prescription' && (
            <Card>
              <h4 style={{ margin: '0 0 14px' }}>Write Prescription</h4>
              {rxItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
                  <Select label={i === 0 ? 'Drug' : ''} value={item.drug} onChange={v => {
                    const n = [...rxItems]; n[i].drug = v; setRxItems(n);
                  }} options={drugs.map(d => ({ value: d.id, label: `${d.name} ${d.strength}` }))} />
                  <Input label={i === 0 ? 'Dose' : ''} value={item.dose} onChange={v => { const n=[...rxItems]; n[i].dose=v; setRxItems(n); }} placeholder="500mg" />
                  <Input label={i === 0 ? 'Frequency' : ''} value={item.frequency} onChange={v => { const n=[...rxItems]; n[i].frequency=v; setRxItems(n); }} placeholder="TID" />
                  <Input label={i === 0 ? 'Duration' : ''} value={item.duration} onChange={v => { const n=[...rxItems]; n[i].duration=v; setRxItems(n); }} placeholder="7 days" />
                  <Input label={i === 0 ? 'Qty' : ''} type="number" value={item.quantity} onChange={v => { const n=[...rxItems]; n[i].quantity=v; setRxItems(n); }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setRxItems([...rxItems, { drug:'', dose:'', frequency:'', duration:'', quantity:1, instructions:'' }])}>
                  + Add Drug
                </Button>
                <Button variant="primary" size="sm" icon="💊" onClick={writePrescription} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Prescription'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export function DoctorDashboard({ activePage, onNavigate }) {
  const [selectedVisit, setSelectedVisit] = useState(null);
  switch (activePage) {
    case 'my_queue':     return <MyQueuePage onNavigate={onNavigate} onSelectVisit={setSelectedVisit} />;
    case 'consultation': return <ConsultationPage selectedVisit={selectedVisit} onNavigate={onNavigate} />;
    default: return (
      <div>
        <SectionHeader title="Doctor Dashboard" />
        <div className="grid-stats">
          <StatCard label="My Queue"     value="–" icon="👥" color="#4A148C" />
          <StatCard label="Completed"    value="–" icon="✅" color="#198754" />
        </div>
        <div style={{ marginTop: 20 }}>
          <Button variant="primary" icon="👥" onClick={() => onNavigate('my_queue')}>Open My Queue</Button>
        </div>
      </div>
    );
  }
}