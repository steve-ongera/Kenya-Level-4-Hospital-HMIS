/**
 * pages/auth/LoginPage.jsx
 */

import { useState } from 'react';
import { authAPI } from '../../services/api';

export default function LoginPage({ onLogin }) {
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      localStorage.setItem('access_token',  data.access);
      localStorage.setItem('refresh_token', data.refresh);
      const user = {
        user_id:     data.user_id,
        username:    form.username,
        role:        data.role,
        full_name:   data.full_name,
        employee_id: data.employee_id,
        department:  data.department,
      };
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A2E2A 0%, #0A6B5E 60%, #12897A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 20px',
          }}>🏥</div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem', marginBottom: 6 }}>
            Kenya National Hospital
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem' }}>
            Hospital Management Information System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: '36px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>Sign In</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 24 }}>
            Access your role-specific module
          </p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-person" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: 36 }}
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: 36 }}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><span className="spinner spinner-sm" /> Signing in…</> : <><i className="bi bi-box-arrow-in-right" /> Sign In</>}
            </button>
          </form>

          {/* Demo accounts hint */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: '#F0F4F3', borderRadius: 10 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>DEMO ACCOUNTS (password: 1234)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[['reception1','Receptionist'],['nurse1','Nurse'],['doctor1','Doctor'],['pharmacy1','Pharmacist'],['lab1','Lab'],['radiology1','Radiology'],['admin1','Admin']].map(([u,l]) => (
                <button key={u} onClick={() => setForm({ username: u, password: '1234' })}
                  style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 10px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text)', transition: 'all 0.15s' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: 20 }}>
          HMIS v2.0 · MOH Kenya · SHA · eTIMS Compliant
        </p>
      </div>
    </div>
  );
}