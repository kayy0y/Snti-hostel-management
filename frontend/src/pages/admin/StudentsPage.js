import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAllStudents, addStudent, deleteStudent } from '../../utils/api';
import toast from 'react-hot-toast';

const EMPTY = { name:'', email:'', password:'', trainee_id:'', trainee_type:'', hostel_block:'', member_type:'Hostel' };

export default function StudentsPage() {
  const [list,     setList]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');

  const load = () => { setLoading(true); getAllStudents().then(r => setList(r.data.data)).catch(() => toast.error('Failed to load.')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleAdd = async e => {
    e.preventDefault();
    setSaving(true);
    try { await addStudent(form); toast.success('Student added.'); setShowForm(false); setForm(EMPTY); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try { await deleteStudent(id); toast.success('Deactivated.'); load(); }
    catch { toast.error('Failed.'); }
  };

  const f = field => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });
  const filtered = list.filter(s => [s.name, s.email, s.trainee_id, s.hostel_block].some(v => v?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="page"><Navbar />
      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Students & Members ({list.length})</h2>
          <button className={`btn btn-sm ${showForm ? 'btn-outline' : 'btn-primary'}`} onClick={() => { setShowForm(s => !s); setForm(EMPTY); }}>
            {showForm ? 'Cancel' : '+ Add Student'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div className="card-title">Add New Student / Member</div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Member Type</label>
                <select className="form-control" {...f('member_type')}>
                  <option value="Hostel">Hostel Student</option>
                  <option value="Mess Only">External Member (Mess Only)</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-control" {...f('name')} required /></div>
                <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" {...f('email')} required /></div>
              </div>
              {form.member_type === 'Hostel' && (
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Trainee ID</label><input className="form-control" {...f('trainee_id')} /></div>
                  <div className="form-group">
                    <label className="form-label">Trainee Type</label>
                    <select className="form-control" {...f('trainee_type')}>
                      <option value="">-- Select --</option>
                      <option value="Vocational Trainee">Vocational Trainee</option>
                      <option value="Pre Trainee">Pre Trainee</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="form-row">
                {form.member_type === 'Hostel' && <div className="form-group"><label className="form-label">Hostel Block</label><input className="form-control" {...f('hostel_block')} /></div>}
                <div className="form-group"><label className="form-label">Default Password *</label><input type="password" className="form-control" {...f('password')} required /></div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
            </form>
          </div>
        )}

        <div className="form-group" style={{ maxWidth:320, marginBottom:'1rem' }}>
          <input className="form-control" placeholder="Search by name, email, ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card">
          {loading ? <div className="loading"><div className="spinner" /></div> : filtered.length === 0 ? (
            <div className="empty-state">No students found.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Type</th><th>Trainee ID</th><th>Block</th><th>Status</th><th>Joined</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight:600 }}>{s.name}</div><div style={{ fontSize:'.75rem', color:'#9ca3af' }}>{s.email}</div></td>
                      <td><span className={`badge ${s.member_type === 'Mess Only' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize:'.7rem' }}>{s.member_type}</span></td>
                      <td style={{ fontSize:'.83rem' }}>{s.trainee_id || '—'}</td>
                      <td style={{ fontSize:'.83rem' }}>{s.hostel_block || '—'}</td>
                      <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ fontSize:'.78rem', color:'#6b7280' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                      <td>{s.is_active && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}>Deactivate</button>}</td>
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
