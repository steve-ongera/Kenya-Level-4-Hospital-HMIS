/**
 * pages/auth/LoginPage.jsx
 * Single login page → redirects to the correct module dashboard based on role.
 */

import { useState } from 'react';
import { authService } from '../../services/api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Please enter username and password.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authService.login(username, password);
      localStorage.setItem('access_token',  data.access);
      localStorage.setItem('refresh_token', data.refresh);
      const user = {
        username,
        full_name:   data.full_name,
        role:        data.role,
        employee_id: data.employee_id,
        department:  data.department,
        user_id:     data.user_id,
      };
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const DEMO_USERS = [
    { u: 'reception', r: 'Receptionist' },
    { u: 'nurse',     r: 'Nurse' },
    { u: 'doctor',    r: 'Doctor' },
    { u: 'pharmacy',  r: 'Pharmacy' },
    { u: 'lab',       r: 'Lab Tech' },
    { u: 'radiology', r: 'Radiographer' },
    { u: 'admin',     r: 'Admin' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A2E2A 0%, #0D4A43 50%, #1A6B5E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{
        display: 'flex', width: '100%', maxWidth: 880,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
      }}>
        {/* ── Left Panel ── */}
        <div style={{
          flex: 1, background: 'linear-gradient(160deg, #0A6B5E 0%, #064D44 100%)',
          padding: '40px 36px', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', minWidth: 0,
        }}>
          <div>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🏥</div>
            <h1 style={{ color: '#fff', margin: '0 0 8px', fontSize: 24, fontWeight: 800, lineHeight: 1.3 }}>
              Kenya National<br />Hospital HMIS
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
              Hospital Management Information System<br />
              Level 4 · Ministry of Health Kenya
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
              {['eTIMS Integrated', 'SHA Compliant', 'MOH Kenya', 'Level 4 Certified'].map((t) => (
                <span key={t} style={{
                  background: 'rgba(255,255,255,0.14)', borderRadius: 20,
                  padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: 600,
                }}>✓ {t}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {['👩‍💼 Receptionist', '👩‍⚕️ Nurse', '👨‍⚕️ Doctor', '💊 Pharmacy', '🔬 Laboratory', '🩻 Radiology', '📊 Administration'].map((r) => (
                <div key={r} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{r}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={{ width: 360, background: '#fff', padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1A2E2C' }}>Welcome Back</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6B8280' }}>Sign in to your module</p>
          </div>

          {error && (
            <div style={{
              background: '#FDEEEE', border: '1px solid #F5C6CB', borderRadius: 8,
              padding: '10px 14px', color: '#DC3545', fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>⚠️ {error}</div>
          )}

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="form-control"
              autoFocus
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="form-control"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: loading ? '#ccc' : '#0A6B5E',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Authenticating…' : 'Sign In →'}
          </button>

          {/* Demo shortcuts */}
          <div style={{ marginTop: 22, padding: 14, background: '#F8FAFA', borderRadius: 10, border: '1px solid #D4E0DE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B8280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Demo Logins (password: 1234)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {DEMO_USERS.map(({ u, r }) => (
                <button
                  key={u}
                  onClick={() => { setUsername(u); setPassword('1234'); setError(''); }}
                  style={{
                    padding: '3px 9px', background: '#E8F5F3', border: '1px solid #C8E8E3',
                    borderRadius: 6, fontSize: 11, color: '#0A6B5E', cursor: 'pointer',
                    fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.1s',
                  }}
                  title={r}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}