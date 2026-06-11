import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAllStudents, addStudent, deleteStudent, deleteStudentNow, getAllMenuSelections } from '../../utils/api';
import toast from 'react-hot-toast';

const EMPTY = { name:'', email:'', password:'', trainee_id:'', trainee_type:'', hostel_block:'', member_type:'Hostel' };
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const fmtWeek = (ws) => {
  if (!ws) return '';
  const s = new Date(ws), e = new Date(ws);
  e.setDate(e.getDate() + 6);
  const f = d => d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  return `${f(s)} – ${f(e)}, ${e.getFullYear()}`;
};

// ── Student row card for menu selections tab ──────────────────────────────
const MenuStudentCard = ({ name, email, role, hostel_block, member_type, days }) => {
  const [expanded, setExpanded] = useState(false);
  const isExternal = member_type === 'Mess Only';

  const filledDays = days.filter(d => d.breakfast || d.lunch || d.dinner).length;

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden',
      marginBottom: '.75rem', transition: 'box-shadow .15s',
      boxShadow: expanded ? '0 4px 12px rgba(0,0,0,.08)' : '0 1px 3px rgba(0,0,0,.06)',
    }}>
      {/* Header — click to expand */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.75rem 1rem', cursor: 'pointer', background: expanded ? '#f0f4ff' : '#fff',
          transition: 'background .12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{name}</div>
            <div style={{ fontSize: '.75rem', color: '#9ca3af' }}>{email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span className={`badge ${member_type === 'Mess Only' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '.7rem' }}>
            {member_type}
          </span>

          {/* Progress pill */}
          <div style={{
            background: filledDays === 7 ? '#dcfce7' : filledDays > 0 ? '#fef9c3' : '#fee2e2',
            color:      filledDays === 7 ? '#15803d' : filledDays > 0 ? '#a16207' : '#dc2626',
            borderRadius: 99, padding: '.2rem .7rem', fontSize: '.75rem', fontWeight: 700, minWidth: 80, textAlign: 'center',
          }}>
            {filledDays}/7 days
          </div>

          <span style={{ color: '#6b7280', fontSize: '.9rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded — full week table */}
      {expanded && (
        <div style={{ padding: '0 1rem 1rem', background: '#fafbff' }}>
          {filledDays === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.25rem', color: '#9ca3af', fontSize: '.85rem' }}>
              No menu selected for this week.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '.75rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.83rem', minWidth: 480 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '.5rem .75rem', background: '#f0f4ff', textAlign: 'left', fontWeight: 700, color: '#1e40af', borderBottom: '2px solid #dbeafe', width: 120 }}>Day</th>
                    <th style={{ padding: '.5rem .75rem', background: '#f0f4ff', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #dbeafe' }}>Breakfast</th>
                    <th style={{ padding: '.5rem .75rem', background: '#f0f4ff', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #dbeafe' }}>Lunch</th>
                    {!isExternal && (
                      <th style={{ padding: '.5rem .75rem', background: '#f0f4ff', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #dbeafe' }}>Dinner</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {days.map((row, i) => {
                    const hasAny = row.breakfast || row.lunch || row.dinner;
                    return (
                      <tr key={row.day_name} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '.5rem .75rem', fontWeight: 600, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                          {row.day_name}
                        </td>
                        <td style={{ padding: '.5rem .75rem', color: row.breakfast ? '#111827' : '#d1d5db', borderBottom: '1px solid #f3f4f6' }}>
                          {row.breakfast || '—'}
                        </td>
                        <td style={{ padding: '.5rem .75rem', color: row.lunch ? '#111827' : '#d1d5db', borderBottom: '1px solid #f3f4f6' }}>
                          {row.lunch || '—'}
                        </td>
                        {!isExternal && (
                          <td style={{ padding: '.5rem .75rem', color: row.dinner ? '#111827' : '#d1d5db', borderBottom: '1px solid #f3f4f6' }}>
                            {row.dinner || '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function StudentsPage() {
  const [tab,      setTab]      = useState('students'); // 'students' | 'menu'
  const [list,     setList]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');

  // Menu selections state
  const [menuData,       setMenuData]       = useState([]);  // flat array from API
  const [menuWeekStart,  setMenuWeekStart]  = useState('');
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [menuLoading,    setMenuLoading]    = useState(false);
  const [menuSearch,     setMenuSearch]     = useState('');

  const loadStudents = () => {
    setLoading(true);
    getAllStudents()
      .then(r => setList(r.data.data))
      .catch(() => toast.error('Failed to load students.'))
      .finally(() => setLoading(false));
  };

  const loadMenuSelections = useCallback(async (ws) => {
    setMenuLoading(true);
    try {
      const r = await getAllMenuSelections(ws || undefined);
      setMenuData(r.data.data);
      setMenuWeekStart(r.data.week_start);
      if (r.data.available_weeks?.length) setAvailableWeeks(r.data.available_weeks);
    } catch { toast.error('Failed to load menu selections.'); }
    finally { setMenuLoading(false); }
  }, []);

  useEffect(() => { loadStudents(); }, []);

  // Load menu selections when tab switches to 'menu'
  useEffect(() => {
    if (tab === 'menu' && menuData.length === 0 && !menuLoading) {
      loadMenuSelections();
    }
  }, [tab]);

  const handleAdd = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await addStudent(form);
      toast.success('Student added.');
      setShowForm(false); setForm(EMPTY); loadStudents();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? Account will be permanently deleted after 48 hours.`)) return;
    try { await deleteStudent(id); toast.success('Deactivated. Will be deleted in 48hrs.'); loadStudents(); }
    catch { toast.error('Failed.'); }
  };

 const handleDeleteNow = async (id, name) => {
  const archive = window.confirm(
    `Permanently delete ${name}?\n\nOK = Archive data first\nCancel = Delete without archive`
  );

  const proceed = window.confirm(
    `This will permanently delete ${name}. This cannot be undone.\nProceed?`
  );

  if (!proceed) return;

  try {
    await deleteStudentNow(id, archive);
    toast.success(
      `${name} permanently deleted.${archive ? ' Data archived.' : ''}`
    );
    loadStudents();
  } catch (err) {
    toast.error(err.response?.data?.message || 'Delete failed.');
  }
};

  const f = field => ({ value: form[field], onChange: e => setForm(p => ({...p, [field]: e.target.value})) });

  const filteredStudents = list.filter(s =>
    [s.name, s.email, s.trainee_id, s.hostel_block].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  // Group flat menu rows by user_id → { userId: { name, email, member_type, days: [] } }
  const groupedMenu = (() => {
  const map = {};

  (menuData || []).forEach(row => {
      if (!map[row.user_id]) {
        map[row.user_id] = {
          user_id:     row.user_id,
          name:        row.name,
          email:       row.email,
          hostel_block:row.hostel_block,
          member_type: row.member_type,
          role:        row.role,
          days:        DAYS.map(d => ({ day_name: d, breakfast: null, lunch: null, dinner: null })),
        };
      }
      const dayEntry = map[row.user_id].days.find(d => d.day_name === row.day_name);
      if (dayEntry) {
        dayEntry.breakfast = row.breakfast;
        dayEntry.lunch     = row.lunch;
        dayEntry.dinner    = row.dinner;
      }
    });
    return Object.values(map);
  })();

  const filteredMenu = groupedMenu.filter(s =>
    [s.name, s.email].some(v => v?.toLowerCase().includes(menuSearch.toLowerCase()))
  );

  const totalSelected  = groupedMenu.length;
const totalStudents  = list.filter(s => s.is_active).length;
const notSelected    = Math.max(0, totalStudents - totalSelected);
  return (
    <div className="page">
      <Navbar />
      <div className="main">

        {/* Page tabs */}
        <div style={{ display:'flex', gap:'.4rem', marginBottom:'1.5rem', borderBottom:'2px solid #e5e7eb', paddingBottom:'.75rem' }}>
          <button
            className={`btn btn-sm ${tab==='students'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('students')}
          >
            Students ({list.length})
          </button>
          <button
            className={`btn btn-sm ${tab==='menu'?'btn-primary':'btn-outline'}`}
            onClick={() => setTab('menu')}
          >
            Menu Selections
            {totalSelected > 0 && (
              <span style={{ background:'rgba(255,255,255,.3)', borderRadius:99, padding:'0 6px', marginLeft:'.3rem', fontSize:'.7rem' }}>
                {totalSelected}
              </span>
            )}
          </button>
        </div>

        {/* ── STUDENTS TAB ─────────────────────────────────────── */}
        {tab === 'students' && (
          <>
            <div className="section-header">
              <h2 className="section-title">Students & Members ({list.length})</h2>
              <button
                className={`btn btn-sm ${showForm ? 'btn-outline' : 'btn-primary'}`}
                onClick={() => { setShowForm(s => !s); setForm(EMPTY); }}
              >
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
              {loading ? <div className="loading"><div className="spinner" /></div>
              : filteredStudents.length === 0 ? <div className="empty-state">No students found.</div>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Type</th><th>Trainee ID</th><th>Block</th><th>Status</th><th>Joined</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(s => (
                        <tr key={s.id}>
                          <td><div style={{ fontWeight:600 }}>{s.name}</div><div style={{ fontSize:'.75rem', color:'#9ca3af' }}>{s.email}</div></td>
                          <td><span className={`badge ${s.member_type==='Mess Only'?'badge-warning':'badge-info'}`} style={{ fontSize:'.7rem' }}>{s.member_type}</span></td>
                          <td style={{ fontSize:'.83rem' }}>{s.trainee_id || '—'}</td>
                          <td style={{ fontSize:'.83rem' }}>{s.hostel_block || '—'}</td>
                          <td><span className={`badge ${s.is_active?'badge-success':'badge-danger'}`}>{s.is_active?'Active':'Inactive'}</span></td>
                          <td style={{ fontSize:'.78rem', color:'#6b7280' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                          <td>{s.is_active
                            ? <div style={{ display:'flex', gap:'.3rem' }}>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}>Deactivate</button>
                                <button className="btn btn-sm" style={{ background:'#7f1d1d', color:'#fff', fontSize:'.72rem' }} onClick={() => handleDeleteNow(s.id, s.name)}>Delete Now</button>
                              </div>
                            : <button className="btn btn-sm" style={{ background:'#7f1d1d', color:'#fff', fontSize:'.72rem' }} onClick={() => handleDeleteNow(s.id, s.name)}>Delete Now</button>
                          }</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MENU SELECTIONS TAB ──────────────────────────────── */}
        {tab === 'menu' && (
          <>
            <div className="section-header">
              <div>
                <h2 className="section-title">Menu Selections</h2>
                {menuWeekStart && (
                  <p style={{ fontSize:'.82rem', color:'#6b7280', marginTop:'.2rem' }}>
                    Week: <strong>{fmtWeek(menuWeekStart)}</strong>
                  </p>
                )}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => loadMenuSelections(menuWeekStart)}>
                Refresh
              </button>
            </div>

            {/* Week dropdown */}
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                <label style={{ fontSize:'.83rem', fontWeight:600, color:'#6b7280' }}>Week:</label>
                <select
                  className="form-control"
                  style={{ minWidth:200 }}
                  value={menuWeekStart}
                  onChange={e => loadMenuSelections(e.target.value)}
                >
                  {availableWeeks.map(w => (
                    <option key={w.week_start} value={w.week_start}>
                      {fmtWeek(w.week_start)} ({w.student_count} students)
                    </option>
                  ))}
                  {availableWeeks.length === 0 && menuWeekStart && (
                    <option value={menuWeekStart}>{fmtWeek(menuWeekStart)}</option>
                  )}
                </select>
              </div>

              {/* Coverage stats */}
              {!menuLoading && (
                <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
                  <div style={{ background:'#dcfce7', borderRadius:8, padding:'.35rem .85rem', fontSize:'.8rem', color:'#15803d', fontWeight:600 }}>
                    {totalSelected} selected
                  </div>
                  {notSelected > 0 && (
                    <div style={{ background:'#fee2e2', borderRadius:8, padding:'.35rem .85rem', fontSize:'.8rem', color:'#dc2626', fontWeight:600 }}>
                      {notSelected} not selected
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="form-group" style={{ maxWidth:300, marginBottom:'1rem' }}>
              <input
                className="form-control"
                placeholder="Search student…"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
              />
            </div>

            {menuLoading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : filteredMenu.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize:'2.5rem', marginBottom:'.75rem' }}>🍽️</div>
                  <p style={{ fontWeight:600 }}>No menu selections for this week</p>
                  <p style={{ fontSize:'.82rem', color:'#9ca3af', marginTop:'.35rem' }}>
                    Students haven't selected their menu yet, or the weekly plan hasn't been published.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize:'.8rem', color:'#6b7280', marginBottom:'.75rem' }}>
                  Click a student card to expand and view their full weekly menu.
                </p>
                {filteredMenu.map(student => (
                  <MenuStudentCard
                    key={student.user_id}
                    name={student.name}
                    email={student.email}
                    role={student.role}
                    hostel_block={student.hostel_block}
                    member_type={student.member_type}
                    days={student.days}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}