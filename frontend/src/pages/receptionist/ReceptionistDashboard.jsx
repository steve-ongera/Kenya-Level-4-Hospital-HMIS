/**
 * pages/receptionist/ReceptionistDashboard.jsx
 * Full receptionist module:
 *   dashboard → search → register patient → register visit → queue monitor → payments
 */

import { useState, useEffect } from 'react';
import { patientService, visitService, specialistService, billingService, dashboardService } from '../../services/api';
import {
  StatCard, SectionHeader, Card, Button, Badge,
  Input, Select, Textarea, Modal, Table, Alert, Spinner,
} from '../../components/ui';

// ── Helpers ──────────────────────────────────────────────────────────────────

const VISIT_STATUS_COLOR = {
  registered:   'muted',
  payment_done: 'warning',
  triage_done:  'info',
  in_consult:   'primary',
  paused:       'warning',
  prescribing:  'info',
  pharmacy:     'info',
  discharged:   'success',
  referred:     'muted',
  admitted:     'danger',
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    dashboardService.stats().then(r => setStats(r.data)).catch(() => {});
    visitService.queue().then(r => setQueue(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <SectionHeader
        title="Reception Dashboard"
        sub={new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Today's Visits"    value={stats?.today_visits      ?? '…'} icon="📋" color="#0A6B5E" sub="Registered today" />
        <StatCard label="In Queue"          value={stats?.waiting_queue     ?? '…'} icon="⏳" color="#D48C10" sub="Awaiting triage" />
        <StatCard label="In Consultation"   value={stats?.in_consultation   ?? '…'} icon="🩺" color="#4A148C" sub="With doctor now" />
        <StatCard label="Discharged Today"  value={stats?.discharged_today  ?? '…'} icon="✅" color="#198754" sub="Completed" />
        <StatCard label="Today's Revenue"   value={`KES ${(stats?.today_revenue ?? 0).toLocaleString()}`} icon="💰" color="#0097A7" sub="Collected" />
      </div>

      <div className="grid-2">
        {/* Live Queue */}
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📋 Today's Queue</h3>
          <Table
            columns={[
              { key: 'visit_number',  label: 'Visit No.',
                render: v => <span className="patient-id">{v}</span> },
              { key: 'patient_name',  label: 'Patient' },
              { key: 'specialist_name',label: 'Specialist' },
              { key: 'status',        label: 'Status',
                render: v => <Badge color={VISIT_STATUS_COLOR[v] || 'muted'}>{v?.replace('_',' ')}</Badge> },
            ]}
            data={queue.slice(0, 8)}
          />
        </Card>

        {/* Quick actions */}
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button fullWidth variant="primary" icon="🔍" onClick={() => onNavigate('search')}>
              Search / Find Patient
            </Button>
            <Button fullWidth variant="outline" icon="➕" onClick={() => onNavigate('register')}>
              Register New Patient
            </Button>
            <Button fullWidth variant="outline" icon="📋" onClick={() => onNavigate('visit')}>
              Register Return Visit
            </Button>
            <Button fullWidth variant="ghost"   icon="👥" onClick={() => onNavigate('queue')}>
              View Full Queue
            </Button>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#FFF8E1', borderRadius: 8, border: '1px solid #FFE082' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D48C10', marginBottom: 4 }}>🛡️ SHA Status Today</div>
            <div style={{ fontSize: 12 }}>8 SHA-verified patients</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Claims: KES 12,400 pending sync</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: SEARCH PATIENT
// ─────────────────────────────────────────────────────────────────────────────
function SearchPage({ onNavigate, onSelectPatient }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [searched,setSearched]= useState(false);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await patientService.search(query);
      setResults(data.results);
      setSearched(true);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <SectionHeader
        title="Find Patient"
        sub="Search by phone number, national ID, full name, or guardian phone (for children)"
        action={<Button variant="primary" icon="➕" onClick={() => onNavigate('register')}>New Patient</Button>}
      />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Input
            label="Search Query"
            value={query}
            onChange={setQuery}
            placeholder="Phone: 0712… · ID: 28734… · Name: Grace Wanjiku · Guardian phone"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Button variant="primary" icon="🔍" onClick={doSearch} size="md">Search</Button>
          <Button variant="ghost" onClick={() => { setQuery(''); setResults([]); setSearched(false); }}>Clear</Button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
          💡 For paediatric patients, enter the mother's or guardian's phone number
        </div>
      </Card>

      {loading && <Spinner />}

      {!loading && searched && (
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </h3>
          <Table
            columns={[
              { key: 'patient_number', label: 'Patient ID',    render: v => <span className="patient-id">{v}</span> },
              { key: 'full_name',      label: 'Full Name',     render: (v, r) => <strong>{v}</strong> },
              { key: 'phone',          label: 'Phone' },
              { key: 'gender',         label: 'Gender' },
              { key: 'age',            label: 'Age' },
              { key: 'sha_number',     label: 'SHA No.',
                render: v => v ? <Badge color="success">{v}</Badge> : <Badge color="muted">None</Badge> },
              { key: 'total_visits',   label: 'Visits',
                render: v => <Badge color="primary">{v}</Badge> },
            ]}
            data={results}
            actions={(row) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" variant="primary" onClick={() => { onSelectPatient(row); onNavigate('visit'); }}>
                  Register Visit
                </Button>
                <Button size="sm" variant="outline" onClick={() => onSelectPatient(row)}>
                  View
                </Button>
              </div>
            )}
          />
          {results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>
                No patient found for <strong>{query}</strong>
              </p>
              <Button variant="primary" icon="➕" onClick={() => onNavigate('register')}>
                Register as New Patient
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: REGISTER PATIENT
// ─────────────────────────────────────────────────────────────────────────────
function RegisterPatientPage({ onNavigate, onPatientCreated }) {
  const empty = {
    first_name:'', middle_name:'', last_name:'', date_of_birth:'', gender:'',
    id_type:'National ID', id_number:'', phone:'', alt_phone:'', email:'',
    county:'', sha_number:'', nhif_number:'',
    blood_group:'Unknown', allergies:'', chronic_conditions:'',
    nok_name:'', nok_phone:'', nok_relation:'',
    is_minor: false, guardian_name:'', guardian_phone:'', guardian_relation:'', guardian_id:'',
  };
  const [form, setForm]     = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const f = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const submit = async () => {
    if (!form.first_name || !form.last_name || !form.phone || !form.date_of_birth || !form.gender) {
      setError('Please fill all required fields.'); return;
    }
    setSaving(true); setError('');
    try {
      const { data } = await patientService.create(form);
      onPatientCreated(data);
      onNavigate('visit');
    } catch (e) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : 'Registration failed.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader title="Register New Patient" sub="Fill patient demographics below" />

      {error && <Alert type="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Demographics */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>👤 Demographics</h3>
          <div className="form-row">
            <Input label="First Name"  value={form.first_name}  onChange={f('first_name')}  required />
            <Input label="Middle Name" value={form.middle_name} onChange={f('middle_name')} />
            <Input label="Last Name"   value={form.last_name}   onChange={f('last_name')}   required />
            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={f('date_of_birth')} required />
          </div>
          <div className="form-row">
            <Select label="Gender" value={form.gender} onChange={f('gender')} required
              options={[{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]} />
            <Select label="Blood Group" value={form.blood_group} onChange={f('blood_group')}
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map(v=>({value:v,label:v}))} />
            <Select label="ID Type" value={form.id_type} onChange={f('id_type')}
              options={['National ID','Birth Certificate','Passport','Alien ID'].map(v=>({value:v,label:v}))} />
            <Input label="ID Number" value={form.id_number} onChange={f('id_number')} />
          </div>
          <div className="form-row">
            <Input label="Phone Number"     value={form.phone}     onChange={f('phone')}     required />
            <Input label="Alt. Phone"       value={form.alt_phone} onChange={f('alt_phone')} />
            <Input label="County"           value={form.county}    onChange={f('county')} />
            <Input label="Email (optional)" type="email" value={form.email} onChange={f('email')} />
          </div>
          <Textarea label="Allergies"          value={form.allergies}          onChange={f('allergies')}          rows={2} placeholder="List any known drug allergies" />
          <Textarea label="Chronic Conditions" value={form.chronic_conditions} onChange={f('chronic_conditions')} rows={2} placeholder="e.g. Diabetes, Hypertension" />
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Insurance */}
          <Card>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🛡️ Insurance</h3>
            <Input label="SHA Member Number"  value={form.sha_number}  onChange={f('sha_number')}  hint="Social Health Authority" />
            <Input label="NHIF No. (legacy)"  value={form.nhif_number} onChange={f('nhif_number')} />
          </Card>

          {/* Paediatric */}
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>👶 Paediatric / Guardian</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="is_minor" checked={form.is_minor} onChange={e => setForm(p => ({ ...p, is_minor: e.target.checked }))} />
              <label htmlFor="is_minor" style={{ fontSize: 13, cursor: 'pointer' }}>This patient is a minor (&lt;18 yrs)</label>
            </div>
            {form.is_minor && (
              <>
                <Input label="Guardian Name"     value={form.guardian_name}     onChange={f('guardian_name')}     required />
                <Input label="Guardian Phone"    value={form.guardian_phone}    onChange={f('guardian_phone')}    required hint="Used to search for this child" />
                <Input label="Relationship"      value={form.guardian_relation} onChange={f('guardian_relation')} />
                <Input label="Guardian ID No."   value={form.guardian_id}       onChange={f('guardian_id')} />
              </>
            )}
          </Card>

          {/* Next of Kin */}
          <Card>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>🆘 Next of Kin</h3>
            <Input label="Name"         value={form.nok_name}     onChange={f('nok_name')} />
            <Input label="Phone"        value={form.nok_phone}    onChange={f('nok_phone')} />
            <Input label="Relationship" value={form.nok_relation} onChange={f('nok_relation')} />
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => onNavigate('search')}>Cancel</Button>
        <Button variant="primary" icon="💾" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Register Patient'}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: REGISTER VISIT
// ─────────────────────────────────────────────────────────────────────────────
function RegisterVisitPage({ selectedPatient, onNavigate }) {
  const [specialists, setSpecialists] = useState([]);
  const [step,        setStep]        = useState(1); // 1=specialist, 2=payment, 3=done
  const [form,        setForm]        = useState({ specialist: '', payment_method: 'Cash', mpesa_ref: '', sha_auth_code: '' });
  const [invoice,     setInvoice]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [visit,       setVisit]       = useState(null);

  useEffect(() => {
    specialistService.list().then(r => setSpecialists(r.data.results || r.data)).catch(() => {});
  }, []);

  const selectedSpec = specialists.find(s => s.id == form.specialist);

  const createVisitAndInvoice = async () => {
    if (!form.specialist) return;
    setSaving(true);
    try {
      // Create visit
      const { data: visitData } = await visitService.create({
        patient: selectedPatient.id,
        specialist: form.specialist,
        payment_method: form.payment_method,
        mpesa_ref: form.mpesa_ref,
        sha_auth_code: form.sha_auth_code,
        visit_type: 'outpatient',
      });
      setVisit(visitData);

      // Create invoice for consultation fee
      const { data: inv } = await billingService.invoices.create({
        visit: visitData.id,
        patient: selectedPatient.id,
        total_amount: selectedSpec.consultation_fee,
        patient_amount: selectedSpec.consultation_fee,
        items: [{
          description: `${selectedSpec.name} – Consultation`,
          category: 'consultation',
          quantity: 1,
          unit_price: selectedSpec.consultation_fee,
        }],
      });
      setInvoice(inv);
      setStep(2);
    } finally { setSaving(false); }
  };

  const recordPayment = async () => {
    if (!invoice) return;
    setSaving(true);
    try {
      await billingService.invoices.addPayment(invoice.id, {
        amount: selectedSpec.consultation_fee,
        method: form.payment_method,
        reference: form.mpesa_ref || form.sha_auth_code,
      });
      setStep(3);
    } finally { setSaving(false); }
  };

  if (!selectedPatient) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>No patient selected. Please search first.</p>
        <Button variant="primary" onClick={() => onNavigate('search')}>Search Patient</Button>
      </Card>
    );
  }

  return (
    <div>
      <SectionHeader title="Register Visit" sub="Select specialist → pay → proceed to triage" />

      {/* Patient summary */}
      <Card style={{ marginBottom: 16, borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: 16 }}>{selectedPatient.full_name}</strong>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
              <span className="patient-id">{selectedPatient.patient_number}</span>
              {' · '}{selectedPatient.gender} · {selectedPatient.age}
              {' · '}📞 {selectedPatient.phone}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedPatient.sha_number && <Badge color="success">SHA: {selectedPatient.sha_number}</Badge>}
            {selectedPatient.allergies && <Badge color="danger">⚠️ Allergy</Badge>}
          </div>
        </div>
      </Card>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        {['Select Specialist & Pay', 'Confirm Payment', 'Done – Go to Triage'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step > i + 1 ? 'var(--color-success)' : step === i + 1 ? 'var(--color-primary)' : 'var(--color-border)',
              color: step >= i + 1 ? '#fff' : 'var(--color-text-muted)', fontWeight: 700, fontSize: 12,
            }}>{step > i + 1 ? '✓' : i + 1}</div>
            <span style={{ fontSize: 12, color: step === i + 1 ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: step === i + 1 ? 700 : 400 }}>{s}</span>
            {i < 2 && <div style={{ width: 30, height: 1, background: 'var(--color-border)' }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid-2">
          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>🏥 Select Specialist</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {specialists.map(s => (
                <div key={s.id} onClick={() => setForm(p => ({ ...p, specialist: s.id }))}
                  style={{
                    padding: '12px 14px', border: `2px solid ${form.specialist == s.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    background: form.specialist == s.id ? 'var(--color-primary-50)' : '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                  </div>
                  <strong style={{ color: 'var(--color-primary)', fontSize: 14 }}>KES {parseInt(s.consultation_fee).toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>💳 Payment Method</h3>
            <Select label="Pay via" value={form.payment_method} onChange={v => setForm(p => ({ ...p, payment_method: v }))}
              options={['Cash','M-Pesa','SHA','Insurance','Waiver'].map(v => ({ value: v, label: v }))} />
            {form.payment_method === 'M-Pesa' &&
              <Input label="M-Pesa Reference" value={form.mpesa_ref} onChange={v => setForm(p => ({ ...p, mpesa_ref: v }))} placeholder="e.g. QHJ7Y8K9LP" required />}
            {form.payment_method === 'SHA' &&
              <Input label="SHA Auth Code" value={form.sha_auth_code} onChange={v => setForm(p => ({ ...p, sha_auth_code: v }))} required />}

            {selectedSpec && (
              <div style={{ marginTop: 20, padding: 14, background: 'var(--color-primary-50)', borderRadius: 8, border: '1px solid var(--color-primary-100)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>CONSULTATION FEE</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>
                  KES {parseInt(selectedSpec.consultation_fee).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{selectedSpec.name}</div>
              </div>
            )}

            <Button fullWidth variant="primary" icon="→" onClick={createVisitAndInvoice}
              disabled={!form.specialist || saving} style={{ marginTop: 16 }}>
              {saving ? 'Creating Visit…' : 'Proceed to Payment'}
            </Button>
          </Card>
        </div>
      )}

      {step === 2 && invoice && (
        <Card style={{ maxWidth: 480 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>💳 Confirm Payment</h3>
          <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Patient:</span>
              <strong>{selectedPatient.full_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Specialist:</span>
              <span>{selectedSpec?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Amount:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: 18 }}>KES {parseInt(selectedSpec?.consultation_fee).toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Method:</span>
              <Badge color="info">{form.payment_method}</Badge>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="success" icon="✅" fullWidth onClick={recordPayment} disabled={saving}>
              {saving ? 'Processing…' : 'Confirm & Record Payment'}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card style={{ maxWidth: 480, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Payment Received!</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            {selectedPatient.full_name} has been registered and payment recorded.<br />
            Patient may now proceed to Triage.
          </p>
          <div style={{ background: 'var(--color-primary-50)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>VISIT NUMBER</div>
            <div className="patient-id" style={{ fontSize: 16 }}>{visit?.visit_number}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="outline" icon="🔍" onClick={() => onNavigate('search')}>New Search</Button>
            <Button variant="primary" icon="👥" onClick={() => onNavigate('queue')}>View Queue</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: QUEUE MONITOR
// ─────────────────────────────────────────────────────────────────────────────
function QueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    visitService.today().then(r => { setQueue(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const byStatus = (s) => queue.filter(v => v.status === s);

  return (
    <div>
      <SectionHeader
        title="Queue Monitor"
        sub="Live view of all patients today"
        action={<Button variant="outline" icon="🔄" onClick={load}>Refresh</Button>}
      />
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          { label: 'Awaiting Triage',   status: 'payment_done', color: '#D48C10', icon: '⏳' },
          { label: 'Awaiting Doctor',   status: 'triage_done',  color: '#0097A7', icon: '🩺' },
          { label: 'In Consultation',   status: 'in_consult',   color: '#4A148C', icon: '👨‍⚕️' },
          { label: 'Paused (Lab/Rad)',  status: 'paused',       color: '#F4A726', icon: '🔬' },
          { label: 'At Pharmacy',       status: 'prescribing',  color: '#BF360C', icon: '💊' },
          { label: 'Discharged',        status: 'discharged',   color: '#198754', icon: '✅' },
        ].map(({ label, status, color, icon }) => (
          <StatCard key={status} label={label} value={byStatus(status).length} icon={icon} color={color} />
        ))}
      </div>
      <Card>
        <Table
          loading={loading}
          columns={[
            { key: 'visit_number',   label: 'Visit No.',   render: v => <span className="patient-id">{v}</span> },
            { key: 'patient_name',   label: 'Patient' },
            { key: 'patient_number', label: 'Patient ID',  render: v => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{v}</span> },
            { key: 'specialist_name',label: 'Specialist' },
            { key: 'doctor_name',    label: 'Doctor',      render: v => v || '—' },
            { key: 'payment_method', label: 'Payment',     render: v => <Badge color="info">{v}</Badge> },
            { key: 'status',         label: 'Status',
              render: v => <Badge color={VISIT_STATUS_COLOR[v] || 'muted'}>{v?.replace(/_/g,' ')}</Badge> },
            { key: 'check_in_time',  label: 'Check-in',
              render: v => v ? new Date(v).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—' },
          ]}
          data={queue}
        />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT RECEPTIONIST MODULE
// ─────────────────────────────────────────────────────────────────────────────
export default function ReceptionistDashboard({ activePage, onNavigate }) {
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handleSelectPatient = (p) => setSelectedPatient(p);

  switch (activePage) {
    case 'dashboard': return <DashboardPage onNavigate={onNavigate} />;
    case 'search':    return <SearchPage onNavigate={onNavigate} onSelectPatient={handleSelectPatient} />;
    case 'register':  return <RegisterPatientPage onNavigate={onNavigate} onPatientCreated={handleSelectPatient} />;
    case 'visit':     return <RegisterVisitPage selectedPatient={selectedPatient} onNavigate={onNavigate} />;
    case 'queue':     return <QueuePage />;
    default:          return <DashboardPage onNavigate={onNavigate} />;
  }
}