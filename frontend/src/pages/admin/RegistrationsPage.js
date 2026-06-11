import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAllRegistrations, approveRegistration, deleteStudent, deleteStudentNow } from '../../utils/api';
import toast from 'react-hot-toast';

// Format date from ISO or YYYY-MM-DD to DD/MM/YYYY
const fmtDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year  = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export default function RegistrationsPage() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [proof,   setProof]   = useState(null);

  const load = () => {
    setLoading(true);
    getAllRegistrations()
      .then(r => setData(r.data.data))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleApproval = async (id, action, name) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} registration for ${name}?`)) return;
    try {
      await approveRegistration(id, action);
      toast.success(`Registration ${action}d.`);
      load();
    } catch { toast.error('Action failed.'); }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Deactivate account for ${name}? Account will be permanently deleted after 48 hours.`)) return;
    try {
      await deleteStudent(userId);
      toast.success(`${name} deactivated. Will be deleted in 48hrs.`);
      load();
    } catch { toast.error('Deactivation failed.'); }
  };

  const handleDeleteNow = async (userId, name) => {
    const archive = window.confirm(`Permanently delete ${name}?\n\nOK = delete AND archive data first.\nCancel = delete WITHOUT archiving.`);
    const proceed = window.confirm(`This will PERMANENTLY delete ${name}. Cannot be undone. Proceed?`);
    if (!proceed) return;
    try {
      await deleteStudentNow(userId, archive);
      toast.success(`${name} permanently deleted.${archive ? ' Data archived.' : ''}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed.'); }
  };

  const FILTERS = ['all', 'active', 'expired', 'pending'];
  const filtered = filter === 'pending'
    ? data.filter(r => r.approval_status === 'pending')
    : filter === 'all'
    ? data
    : data.filter(r => r.status === filter);

  const pendingCount = data.filter(r => r.approval_status === 'pending').length;

  return (
    <div className="page">
      <Navbar />
      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Registrations ({filtered.length})</h2>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pendingCount > 0 && (
                  <span style={{ background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: '.68rem', padding: '0 5px', marginLeft: '.3rem' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment proof modal */}
        {proof && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setProof(null)}
          >
            <div
              style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', maxWidth: 420, width: '90%' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Payment Proof — {proof.name}</div>
              <img src={proof.image} alt="proof" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <button className="btn btn-outline btn-full" style={{ marginTop: '1rem' }} onClick={() => setProof(null)}>Close</button>
            </div>
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No registrations found.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Member Type</th>
                    <th>Mess</th>
                    <th>Reg Date</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const isInactive   = !r.user_is_active;
                    const isExpired    = new Date(r.expiry_date) < new Date();

                    return (
                      <tr
                        key={r.id}
                        style={{
                          opacity:    isInactive ? 0.45 : 1,
                          background: isInactive ? '#f9fafb' : 'inherit',
                          transition: 'opacity .2s',
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{r.email}</div>
                          <div style={{ fontSize: '.72rem', color: '#6b7280' }}>{r.trainee_id || 'External'}</div>
                        </td>

                        <td>
                          <span
                            className={`badge ${r.member_type === 'Mess Only' ? 'badge-warning' : 'badge-info'}`}
                            style={{ fontSize: '.7rem' }}
                          >
                            {r.member_type || 'Hostel'}
                          </span>
                        </td>

                        <td>
                          <span className="badge badge-gray" style={{ fontSize: '.7rem' }}>{r.mess_type}</span>
                        </td>

                        {/* Dates formatted as DD/MM/YYYY */}
                        <td style={{ fontSize: '.8rem' }}>{fmtDate(r.registration_date)}</td>
                        <td style={{ fontSize: '.8rem', color: isExpired ? '#dc2626' : 'inherit' }}>
                          {fmtDate(r.expiry_date)}
                        </td>

                        <td>
                          {isInactive ? (
                            <span className="badge badge-danger">Inactive</span>
                          ) : (
                            <span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                              {r.status}
                            </span>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${
                            r.approval_status === 'approved' ? 'badge-success'
                            : r.approval_status === 'rejected' ? 'badge-danger'
                            : 'badge-warning'
                          }`}>
                            {r.approval_status}
                          </span>
                          {r.payment_proof && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '.72rem', marginLeft: '.3rem' }}
                              onClick={() => setProof({ name: r.name, image: r.payment_proof })}
                            >
                              View Proof
                            </button>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            {r.approval_status === 'pending' && !isInactive && (
                              <div style={{ display: 'flex', gap: '.3rem' }}>
                                <button className="btn btn-success btn-sm" style={{ fontSize: '.72rem' }} onClick={() => handleApproval(r.id, 'approve', r.name)}>Approve</button>
                                <button className="btn btn-danger  btn-sm" style={{ fontSize: '.72rem' }} onClick={() => handleApproval(r.id, 'reject',  r.name)}>Reject</button>
                              </div>
                            )}
                            {!isInactive && (
                              <button className="btn btn-danger btn-sm" style={{ fontSize: '.72rem' }} onClick={() => handleDeactivate(r.user_id, r.name)}>
                                Deactivate
                              </button>
                            )}
                            <button
                              className="btn btn-sm"
                              style={{ background: '#7f1d1d', color: '#fff', fontSize: '.72rem' }}
                              onClick={() => handleDeleteNow(r.user_id, r.name)}
                            >
                              Delete Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}