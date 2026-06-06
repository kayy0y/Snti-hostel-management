import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { registerMess, getMyRegistration } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function MessRegistration() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isExternal = user?.role === 'external';
  const [existing, setExisting] = useState(null);
  const [messType, setMessType] = useState(isExternal ? 'Breakfast+Lunch' : 'Veg');
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getMyRegistration()
      .then(r => setExisting(r.data.data))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerMess({ mess_type: messType });
      toast.success(res.data.message);
      setExisting(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return (
    <div className="page">
      <Navbar />
      <div className="loading"><div className="spinner" /></div>
    </div>
  );

  const isPending  = existing?.approval_status === 'pending';
  const isApproved = existing?.approval_status === 'approved';
  const isRejected = existing?.approval_status === 'rejected';

  return (
    <div className="page">
      <Navbar />
      <div className="main" style={{ maxWidth: 580 }}>
        <div className="section-header">
          <h2 className="section-title">Mess Registration</h2>
        </div>

        {/* No registration yet — show form */}
        {!existing && (
          <div className="card">
            <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: '1.25rem' }}>
              {isExternal
                ? 'Register for Breakfast + Lunch access. Valid for 30 days after admin approval.'
                : 'Register for mess access. An admin will review and approve your registration.'}
            </p>

            {/* Pre-filled info */}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem', fontSize: '.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                {[
                  ['Name',  user?.name],
                  ['Email', user?.email],
                  ['Type',  user?.trainee_type || user?.member_type],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ color: '#6b7280' }}>{k}: </span><strong>{v}</strong></div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {!isExternal && (
                <div className="form-group">
                  <label className="form-label">Mess Type</label>
                  <select className="form-control" value={messType} onChange={e => setMessType(e.target.value)}>
                    <option value="Veg">Vegetarian</option>
                    <option value="Non-Veg">Non-Vegetarian</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
              )}

              {isExternal && (
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  External membership: Breakfast + Lunch only. Dinner is not included.
                </div>
              )}

              <div className="alert alert-warning" style={{ fontSize: '.82rem' }}>
                Validity after approval:{' '}
                {isExternal ? '30 days' : user?.trainee_type === 'Vocational Trainee' ? '90 days' : '2 years'}.
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Registration'}
              </button>
            </form>
          </div>
        )}

        {/* Pending approval */}
        {existing && isPending && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h3 style={{ fontWeight: 800, color: '#a16207', marginBottom: '.5rem' }}>Awaiting Admin Approval</h3>
            <p style={{ color: '#6b7280', fontSize: '.88rem', maxWidth: 380, margin: '0 auto' }}>
              Your registration has been submitted. An admin will review and approve it shortly.
              You'll get access to menu selection and other features once approved.
            </p>
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '1rem', marginTop: '1.5rem', fontSize: '.85rem', color: '#a16207', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                {[
                  ['Mess Type',    existing.mess_type],
                  ['Submitted On', existing.registration_date],
                  ['Expires On',   existing.expiry_date],
                  ['Status',       'Pending Approval'],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ opacity: .75 }}>{k}: </span><strong>{v}</strong></div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: '1rem' }}>
              Refresh this page to check your approval status.
            </p>
          </div>
        )}

        {/* Approved */}
        {existing && isApproved && (
          <div className="card">
            <div className="alert alert-success">Your mess registration is active and approved.</div>
            <table style={{ width: '100%', fontSize: '.88rem' }}>
              <tbody>
                {[
                  ['Name',        user?.name],
                  ['ID',          user?.trainee_id || 'External Member'],
                  ['Type',        user?.trainee_type || user?.member_type],
                  ['Block',       user?.hostel_block || 'N/A'],
                  ['Mess Type',   existing.mess_type],
                  ['Registered',  existing.registration_date],
                  ['Expires',     existing.expiry_date],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '.45rem .25rem', color: '#6b7280', fontWeight: 600, width: '40%', fontSize: '.83rem' }}>{k}</td>
                    <td style={{ padding: '.45rem .25rem', fontSize: '.83rem' }}>{v || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/menu/select')}
            >
              Go to Menu Selection →
            </button>
          </div>
        )}

        {/* Rejected */}
        {existing && isRejected && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h3 style={{ fontWeight: 800, color: '#dc2626', marginBottom: '.5rem' }}>Registration Rejected</h3>
            <p style={{ color: '#6b7280', fontSize: '.88rem' }}>
              Your registration was rejected by the admin. Please contact the mess office for details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}