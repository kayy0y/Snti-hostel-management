import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { getDashboardStats, getQuickAnalytics, deleteExpiredUsers, exportExcel, exportPDF, createAdmin, getAdminList } from '../../utils/api';
import toast from 'react-hot-toast';

const EMPTY = { name:'', email:'', password:'' };

const dl = (blob, name) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,     setStats]     = useState(null);
  const [quick,     setQuick]     = useState(null);
  const [admins,    setAdmins]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([getDashboardStats(), getQuickAnalytics(), getAdminList()])
      .then(([s, q, a]) => { setStats(s.data.data); setQuick(q.data.data); setAdmins(a.data.data); })
      .catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const handleExcel = async () => { try { const r = await exportExcel(); dl(r.data,'snti_report.xlsx'); toast.success('Excel downloaded.'); } catch { toast.error('Export failed.'); } };
  const handlePDF   = async () => { try { const r = await exportPDF();   dl(new Blob([r.data],{type:'application/pdf'}),'snti_report.pdf'); toast.success('PDF downloaded.'); } catch { toast.error('PDF failed.'); } };
  const handleExpired = async () => {
    if (!window.confirm('Deactivate all expired accounts?')) return;
    try { const r = await deleteExpiredUsers(); toast.success(r.data.message); } catch { toast.error('Failed.'); }
  };

  const handleCreateAdmin = async e => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password min 8 chars.'); return; }
    setSaving(true);
    try {
      await createAdmin(form);
      toast.success(`Admin ${form.name} created.`);
      setForm(EMPTY); setShowAdmin(false);
      const r = await getAdminList(); setAdmins(r.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const CARDS = [
    { title:'Students',       desc:'Manage all trainees',          path:'/admin/students' },
    { title:'Registrations',  desc:'View and approve registrations',path:'/admin/registrations' },
    { title:'Menus',          desc:'Manage weekly meal plan',       path:'/admin/menus' },
    { title:'Feedback',       desc:'Student ratings and comments',  path:'/admin/feedback' },
    { title:'Analytics',      desc:'Popularity, trends, coverage',  path:'/admin/analytics' },
    { title:'Settings',       desc:'UPI QR, fees, configuration',   path:'/admin/settings' },
  ];

  return (
    <div className="page"><Navbar />
      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Admin Dashboard</h2>
          <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
            <button className="btn btn-success btn-sm" onClick={handleExcel}>Export Excel</button>
            <button className="btn btn-primary btn-sm" onClick={handlePDF}>Export PDF</button>
            <button className="btn btn-danger  btn-sm" onClick={handleExpired}>Delete Expired</button>
          </div>
        </div>

        {/* Pending approvals alert */}
        {quick?.pending_approvals > 0 && (
          <div className="alert alert-danger" style={{ cursor:'pointer' }} onClick={() => navigate('/admin/registrations')}>
            {quick.pending_approvals} external registration{quick.pending_approvals > 1 ? 's' : ''} awaiting approval. Click to review.
          </div>
        )}

        {/* Stats */}
        {!loading && stats && (
          <div className="stats-grid">
            {[
              { label:'Active Members',    value: stats.total_students },
              { label:'Registrations',     value: stats.total_registrations },
              { label:'Avg Rating',        value: stats.avg_rating ? `${stats.avg_rating} ★` : '—' },
              { label:'Expiring (7 days)', value: stats.expiring_soon, red: stats.expiring_soon > 0 },
              { label:'Pending Approval',  value: stats.pending_approvals, red: stats.pending_approvals > 0 },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={s.red ? { color:'#dc2626' } : {}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mess breakdown */}
        {stats?.mess_breakdown?.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div className="card-title">Registrations by Mess Type</div>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
              {stats.mess_breakdown.map(m => (
                <div key={m.mess_type} style={{ background:'#f9fafb', borderRadius:8, padding:'.75rem 1.25rem', textAlign:'center', minWidth:110 }}>
                  <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#1e40af' }}>{m.count}</div>
                  <div style={{ fontSize:'.78rem', color:'#6b7280' }}>{m.mess_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick analytics */}
        {quick && (quick.top_breakfast || quick.top_lunch || quick.top_dinner) && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.75rem' }}>
              <div className="card-title" style={{ marginBottom:0 }}>Most Popular This Week</div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/analytics')}>Full Analytics</button>
            </div>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
              {[
                { label:'Breakfast', data:quick.top_breakfast, color:'#f59e0b' },
                { label:'Lunch',     data:quick.top_lunch,     color:'#16a34a' },
                { label:'Dinner',    data:quick.top_dinner,    color:'#1e40af' },
              ].map(({ label, data, color }) => (
                <div key={label} style={{ flex:1, minWidth:130, background:'#f9fafb', borderRadius:8, padding:'.75rem 1rem' }}>
                  <div style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</div>
                  {data
                    ? <><div style={{ fontSize:'.95rem', fontWeight:700, color, marginTop:'.25rem' }}>{data.item}</div><div style={{ fontSize:'.72rem', color:'#6b7280' }}>{data.count} selections</div></>
                    : <div style={{ fontSize:'.8rem', color:'#9ca3af', marginTop:'.25rem' }}>No data</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav cards */}
        <div className="dash-grid" style={{ marginBottom:'2rem' }}>
          {CARDS.map(c => (
            <div key={c.path} className="dash-card" onClick={() => navigate(c.path)}>
              <div className="dash-card-title">{c.title}</div>
              <div className="dash-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Admin accounts */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div>
              <div className="card-title" style={{ marginBottom:0 }}>Admin Accounts</div>
              <p style={{ fontSize:'.8rem', color:'#6b7280', marginTop:'.2rem' }}>Only existing admins can create new admin accounts.</p>
            </div>
            <button className={`btn btn-sm ${showAdmin ? 'btn-outline' : 'btn-primary'}`} onClick={() => { setShowAdmin(s => !s); setForm(EMPTY); }}>
              {showAdmin ? 'Cancel' : '+ Add Admin'}
            </button>
          </div>

          {showAdmin && (
            <form onSubmit={handleCreateAdmin} style={{ background:'#f8faff', border:'1px solid #dbeafe', borderRadius:10, padding:'1.25rem', marginBottom:'1.25rem' }}>
              <div style={{ fontWeight:700, color:'#1e40af', fontSize:'.88rem', marginBottom:'.9rem' }}>Create New Admin Account</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} required />
                </div>
              </div>
              <div className="form-group" style={{ maxWidth:300 }}>
                <label className="form-label">Password *</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} className="form-control" placeholder="Min 8 chars" style={{ paddingRight:'2.8rem' }} value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} required />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position:'absolute', right:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6b7280', padding:0 }}>{showPass?'🙈':'👁️'}</button>
                </div>
              </div>
              <div className="alert alert-warning" style={{ fontSize:'.78rem' }}>Share credentials securely. New admin can login immediately via the staff portal.</div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Admin Account'}</button>
            </form>
          )}

          {admins.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight:600 }}>{a.name}</td>
                      <td style={{ color:'#6b7280', fontSize:'.83rem' }}>{a.email}</td>
                      <td><span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ fontSize:'.8rem', color:'#6b7280' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
