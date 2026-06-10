import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { useAuth } from '../../context/AuthContext';
import { deactivateSelf, deleteSelf } from '../../utils/api';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);
  const [confirmEmail,   setConfirmEmail]   = useState('');
  const [loading,        setLoading]        = useState(false);

  const rows = [
    ['Full Name',    user?.name],
    ['Email',        user?.email],
    ['Phone',        user?.phone ? `+91 ${user.phone}` : '—'],
    ['Member Type',  user?.member_type],
    ['Trainee ID',   user?.trainee_id   || '—'],
    ['Trainee Type', user?.trainee_type || '—'],
    ['Hostel Block', user?.hostel_block || '—'],
    ['Account Role', user?.role],
  ];

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await deactivateSelf();
      toast.success('Account deactivated. Log in again to reactivate.');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deactivation failed.');
    } finally {
      setLoading(false);
      setShowDeactivate(false);
    }
  };

  const handleDelete = async () => {
    if (confirmEmail.toLowerCase() !== user?.email.toLowerCase()) {
      toast.error('Email does not match your account.');
      return;
    }
    setLoading(true);
    try {
      await deleteSelf(confirmEmail);
      toast.success('Your account has been permanently deleted.');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deletion failed.');
    } finally {
      setLoading(false);
      setShowDelete(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <div className="main" style={{ maxWidth: 520 }}>
        <div className="section-header">
          <h2 className="section-title">My Profile</h2>
        </div>

        {/* Profile card */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto' }}>
              👤
            </div>
            <h3 style={{ marginTop: '.75rem', fontWeight: 800 }}>{user?.name}</h3>
            <p style={{ color: '#6b7280', fontSize: '.83rem' }}>{user?.email}</p>
            {user?.role === 'external' && (
              <span className="badge badge-warning" style={{ marginTop: '.4rem' }}>External Member</span>
            )}
          </div>

          <table style={{ width: '100%' }}>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '.6rem .5rem', fontWeight: 600, color: '#6b7280', width: '40%', fontSize: '.84rem' }}>{k}</td>
                  <td style={{ padding: '.6rem .5rem', fontSize: '.84rem' }}>{v || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Account management */}
        <div className="card">
          <div className="card-title">Account Management</div>
          <p style={{ fontSize: '.83rem', color: '#6b7280', marginBottom: '1.25rem' }}>
            Manage your account access. Deactivating is temporary — you can log back in to reactivate.
            Deletion is permanent and cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowDeactivate(true)}
              style={{ border: '1.5px solid #f59e0b', color: '#a16207' }}
            >
              Deactivate Account
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setShowDelete(true)}
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Deactivate confirmation modal */}
        {showDeactivate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight: 800, color: '#a16207', marginBottom: '.75rem' }}>Deactivate Account?</h3>
              <p style={{ fontSize: '.88rem', color: '#374151', marginBottom: '1rem', lineHeight: 1.6 }}>
                Your account will be temporarily disabled and you will be logged out.
                You can reactivate it at any time by logging in again with your email and password.
              </p>
              <div className="alert alert-warning" style={{ fontSize: '.82rem' }}>
                You will lose access to all mess services until you log back in.
              </div>
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
                <button className="btn btn-outline btn-full" onClick={() => setShowDeactivate(false)} disabled={loading}>
                  Cancel
                </button>
                <button
                  className="btn btn-full"
                  style={{ background: '#f59e0b', color: '#fff' }}
                  onClick={handleDeactivate}
                  disabled={loading}
                >
                  {loading ? 'Deactivating…' : 'Yes, Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal — must type email */}
        {showDelete && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight: 800, color: '#dc2626', marginBottom: '.75rem' }}>Permanently Delete Account?</h3>
              <p style={{ fontSize: '.88rem', color: '#374151', marginBottom: '1rem', lineHeight: 1.6 }}>
                This will permanently delete your account and all your data.
                Your registration and feedback records will be preserved for admin records.
                <strong> This cannot be undone.</strong>
              </p>

              <div className="alert alert-danger" style={{ fontSize: '.82rem', marginBottom: '1rem' }}>
                Type your email address to confirm deletion.
              </div>

              <div className="form-group">
                <label className="form-label">Confirm your email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder={user?.email}
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-outline btn-full"
                  onClick={() => { setShowDelete(false); setConfirmEmail(''); }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleDelete}
                  disabled={loading || !confirmEmail}
                >
                  {loading ? 'Deleting…' : 'Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}