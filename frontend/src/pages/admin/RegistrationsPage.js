import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import {
  getAllRegistrations, approveRegistration, deleteStudent, deleteStudentNow,
  getPaymentHistory, recordPayment, verifyPayment,
} from '../../utils/api';
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

const EMPTY_PAYMENT = { amount: '', payment_method: 'Cash', transaction_ref: '', notes: '', payment_date: new Date().toISOString().split('T')[0] };

// ── Payment History panel — shown when row is expanded ────────────────────
const PaymentHistoryPanel = ({ userId, onUpdated }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY_PAYMENT);
  const [saving,  setSaving]  = useState(false);
  const [showForm,setShowForm]= useState(false);

  const load = () => {
    setLoading(true);
    getPaymentHistory(userId)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load payment history.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [userId]);

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      const r = await recordPayment({ user_id: userId, ...form, amount: Number(form.amount) });
      toast.success(r.data.message);
      setForm(EMPTY_PAYMENT);
      setShowForm(false);
      load();
      onUpdated?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record payment.'); }
    finally { setSaving(false); }
  };

  const handleVerify = async (paymentId, action) => {
    if (!window.confirm(`${action === 'verify' ? 'Verify' : 'Reject'} this payment?`)) return;
    try {
      const r = await verifyPayment(paymentId, action);
      toast.success(r.data.message);
      load();
      onUpdated?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed.'); }
  };

  if (loading) return <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '.85rem' }}>Loading payment history…</div>;
  if (!data) return null;

 const { data: payments = [], stats = {} } = data;

  return (
    <div style={{ padding: '1rem 1.25rem', background: '#fafbff', borderTop: '1px solid #e5e7eb' }}>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ background: '#dcfce7', borderRadius: 8, padding: '.5rem 1rem' }}>
          <div style={{ fontSize: '.7rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>₹{stats?.totalPaid || 0}</div>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: 8, padding: '.5rem 1rem' }}>
          <div style={{ fontSize: '.7rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>Payments Made</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8' }}>{stats?.totalPayments || 0}</div>
        </div>
        {(stats?.pending || 0) > 0 && (
          <div style={{ background: '#fef9c3', borderRadius: 8, padding: '.5rem 1rem' }}>
            <div style={{ fontSize: '.7rem', color: '#a16207', fontWeight: 700, textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a16207' }}>{stats?.pending || 0}</div>
          </div>
        )}
      </div>

      {/* Record payment button / form */}
      {!showForm ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
          + Record Payment
        </button>
      ) : (
        <form onSubmit={handleRecord} style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1e40af', marginBottom: '.75rem' }}>Record New Payment</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '.75rem', marginBottom: '.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Amount (₹) *</label>
              <input type="number" className="form-control" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Method</label>
              <select className="form-control" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Transaction Ref</label>
              <input className="form-control" placeholder="UPI ref / receipt no." value={form.transaction_ref} onChange={e => setForm(f => ({ ...f, transaction_ref: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Payment Date</label>
              <input type="date" className="form-control" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-control" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="alert alert-info" style={{ fontSize: '.8rem' }}>
            This will extend the member's access by 30 days from their current expiry date.
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setForm(EMPTY_PAYMENT); }}>Cancel</button>
            <button type="submit" className="btn btn-success btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Record & Extend Access'}</button>
          </div>
        </form>
      )}

      {/* Payment history table */}
      {payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.25rem', color: '#9ca3af', fontSize: '.85rem' }}>
          No payments recorded yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table style={{ fontSize: '.82rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Period</th>
                <th>Status</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{fmtDate(p.payment_date)}</td>
                  <td style={{ fontWeight: 700 }}>₹{p.amount}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: '.68rem' }}>{p.payment_method}</span></td>
                  <td style={{ color: '#6b7280' }}>{p.transaction_ref || '—'}</td>
                  <td style={{ fontSize: '.78rem' }}>{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</td>
                  <td>
                    <span className={`badge ${p.status === 'verified' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.screenshot ? (
                      <a href={p.screenshot} target="_blank" rel="noreferrer" style={{ fontSize: '.75rem', color: '#1e40af', fontWeight: 600 }}>View</a>
                    ) : '—'}
                  </td>
                  <td>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '.3rem' }}>
                        <button className="btn btn-success btn-sm" style={{ fontSize: '.7rem' }} onClick={() => handleVerify(p.id, 'verify')}>Verify</button>
                        <button className="btn btn-danger btn-sm" style={{ fontSize: '.7rem' }} onClick={() => handleVerify(p.id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function RegistrationsPage() {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [proof,       setProof]       = useState(null);
  const [expandedId,  setExpandedId]  = useState(null); // user_id of expanded row

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

        {/* Payment proof modal (registration proof) */}
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

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="loading" style={{ padding: '1.5rem' }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>No registrations found.</div>
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
                    const isInactive = !r.user_is_active;
                    const isExpired  = new Date(r.expiry_date) < new Date();
                    const isExternal = r.role === 'external' || r.member_type === 'Mess Only';
                    const isExpanded = expandedId === r.user_id;

                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          style={{
                            opacity:    isInactive ? 0.45 : 1,
                            background: isExpanded ? '#f0f4ff' : isInactive ? '#f9fafb' : 'inherit',
                            transition: 'opacity .2s, background .15s',
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.4rem' }}>
                              {isExternal && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : r.user_id)}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af',
                                    fontSize: '.85rem', padding: '.1rem', flexShrink: 0, marginTop: '.1rem',
                                  }}
                                  title="View payment history"
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                              )}
                              <div>
                                <div style={{ fontWeight: 600 }}>{r.name}</div>
                                <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{r.email}</div>
                                <div style={{ fontSize: '.72rem', color: '#6b7280' }}>{r.trainee_id || 'External'}</div>
                              </div>
                            </div>
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

                        {/* Expandable payment history row — external members only */}
                        {isExternal && isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0 }}>
                              <PaymentHistoryPanel userId={r.user_id} onUpdated={load} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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