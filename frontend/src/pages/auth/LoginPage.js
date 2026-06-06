import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ adminPortal = false }) {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const portal = adminPortal ? 'admin' : 'student';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await loginUser({ ...form, portal });
      const user = res.data.user;
      login(res.data.token, user);
      toast.success(`Welcome, ${user.name}!`);
      // Always go to dashboard — no conditional redirect logic here
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      // STAY on page — just show error
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>🍽️</div>
          <h1>SNTI Hostel Mess</h1>
          <p>{adminPortal ? 'Staff Portal' : 'Member Portal'}</p>
        </div>

        {adminPortal && (
          <div className="alert alert-warning" style={{ fontSize:'.8rem', marginBottom:'1rem' }}>
            Authorized staff only. Unauthorized access is prohibited.
          </div>
        )}

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-control"
              placeholder={adminPortal ? 'Staff email' : 'your@email.com'}
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); }}
              autoComplete="email" required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} className="form-control"
                placeholder="Enter password"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                style={{ paddingRight:'2.8rem' }}
                autoComplete="current-password" required
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position:'absolute', right:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6b7280', padding:0 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {!adminPortal && (
            <div style={{ textAlign:'right', marginTop:'-.4rem', marginBottom:'.9rem' }}>
              <Link to="/forgot-password" style={{ fontSize:'.8rem', color:'#1e40af', fontWeight:600 }}>
                Forgot Password?
              </Link>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : adminPortal ? 'Sign in as Staff' : 'Sign In'}
          </button>
        </form>

        {!adminPortal && (
          <div style={{ marginTop:'1.25rem', textAlign:'center' }}>
            <p style={{ fontSize:'.84rem', color:'#6b7280' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color:'#1e40af', fontWeight:700 }}>Register here</Link>
            </p>
            <p style={{ fontSize:'.78rem', color:'#9ca3af', marginTop:'.5rem' }}>
              Covers both Hostel Students and External Mess Members
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
