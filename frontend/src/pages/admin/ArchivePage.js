import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import {
  runArchive, getArchiveYears,
  getArchivedRegistrations, getArchivedFeedback, exportArchive,
} from '../../utils/api';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();

export default function ArchivePage() {
  const [years,       setYears]       = useState([]);
  const [selectedYear,setSelectedYear]= useState(CURRENT_YEAR - 1);
  const [regs,        setRegs]        = useState([]);
  const [feedback,    setFeedback]    = useState([]);
  const [fbStats,     setFbStats]     = useState(null);
  const [activeTab,   setActiveTab]   = useState('overview'); // overview | registrations | feedback
  const [loading,     setLoading]     = useState(true);
  const [archiving,   setArchiving]   = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [yearToArchive, setYearToArchive] = useState(CURRENT_YEAR - 1);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadYears = async () => {
    const r = await getArchiveYears();
    setYears(r.data.data);
  };

  useEffect(() => {
    loadYears().finally(() => setLoading(false));
  }, []);

  const loadYearData = async (year) => {
    setLoading(true);
    try {
      const [rRes, fRes] = await Promise.all([
        getArchivedRegistrations(year),
        getArchivedFeedback(year),
      ]);
      setRegs(rRes.data.data);
      setFeedback(fRes.data.data);
      setFbStats(fRes.data.stats);
    } catch {
      toast.error('Failed to load archive data.');
    } finally {
      setLoading(false);
    }
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setActiveTab('overview');
    loadYearData(year);
  };

  const handleRunArchive = async () => {
    setArchiving(true);
    setShowConfirm(false);
    try {
      const r = await runArchive(yearToArchive);
      toast.success(r.data.message);
      await loadYears();
      setSelectedYear(yearToArchive);
      await loadYearData(yearToArchive);
      setActiveTab('overview');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed.');
    } finally {
      setArchiving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r   = await exportArchive(selectedYear);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `snti_archive_${selectedYear}.xlsx`;
      a.click();
      toast.success(`Archive ${selectedYear} downloaded.`);
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const hasData = regs.length > 0 || feedback.length > 0;

  return (
    <div className="page">
      <Navbar />
      <div className="main">

        {/* Header */}
        <div className="section-header">
          <h2 className="section-title">Archive</h2>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {hasData && (
              <button className="btn btn-success btn-sm" onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exporting…' : `Export ${selectedYear} as Excel`}
              </button>
            )}
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowConfirm(true)}
              disabled={archiving}
            >
              {archiving ? 'Archiving…' : 'Archive Now'}
            </button>
          </div>
        </div>

        {/* Archive confirmation dialog */}
        {showConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', maxWidth: 440, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight: 800, color: '#dc2626', marginBottom: '.75rem' }}>Confirm Archive</h3>
              <p style={{ fontSize: '.88rem', color: '#374151', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                This will move all registrations and feedback from the selected year
                into archive tables and <strong>delete them from the active tables</strong>.
                User accounts are kept. This action cannot be undone.
              </p>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Year to Archive</label>
                <select
                  className="form-control"
                  value={yearToArchive}
                  onChange={e => setYearToArchive(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="alert alert-danger" style={{ fontSize: '.82rem' }}>
                All data from <strong>{yearToArchive}</strong> will be moved to archive. This cannot be undone.
              </div>

              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
                <button className="btn btn-outline btn-full" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-danger btn-full" onClick={handleRunArchive} disabled={archiving}>
                  {archiving ? 'Archiving…' : `Archive ${yearToArchive}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main layout: sidebar years + content */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* Year sidebar */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
              Archived Years
            </div>

            {years.length === 0 ? (
              <div style={{ fontSize: '.82rem', color: '#9ca3af', textAlign: 'center', padding: '.75rem 0' }}>
                No archives yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                {years.map(y => (
                  <button
                    key={y.archive_year}
                    onClick={() => handleYearSelect(y.archive_year)}
                    style={{
                      padding: '.5rem .75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: selectedYear === y.archive_year ? '#dbeafe' : '#f9fafb',
                      color:      selectedYear === y.archive_year ? '#1e40af' : '#374151',
                      fontWeight: selectedYear === y.archive_year ? 700 : 500,
                      fontSize: '.85rem', textAlign: 'left', transition: 'all .12s',
                    }}
                  >
                    {y.archive_year}
                    <div style={{ fontSize: '.72rem', color: '#9ca3af', fontWeight: 400 }}>
                      {y.registrations_archived} regs · {y.feedback_archived} fb
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content area */}
          <div>
            {years.length === 0 && (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🗄️</div>
                  <p>No archived data yet.</p>
                  <p style={{ fontSize: '.82rem', color: '#9ca3af', marginTop: '.4rem' }}>
                    Click "Archive Now" to move old data into the archive.
                  </p>
                </div>
              </div>
            )}

            {years.length > 0 && !loading && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1rem' }}>
                  {['overview', 'registrations', 'feedback'].map(tab => (
                    <button
                      key={tab}
                      className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => { setActiveTab(tab); if (tab !== 'overview' && regs.length === 0) loadYearData(selectedYear); }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Overview tab */}
                {activeTab === 'overview' && (
                  <>
                    {(() => {
                      const y = years.find(y => y.archive_year === selectedYear);
                      return y ? (
                        <div>
                          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                            <div className="stat-card"><div className="stat-label">Registrations Archived</div><div className="stat-value">{y.registrations_archived}</div></div>
                            <div className="stat-card"><div className="stat-label">Feedback Archived</div><div className="stat-value">{y.feedback_archived}</div></div>
                            <div className="stat-card"><div className="stat-label">Archive Year</div><div className="stat-value">{y.archive_year}</div></div>
                          </div>
                          <div className="card">
                            <div className="card-title">Archive Info</div>
                            <table style={{ width: '100%', fontSize: '.88rem' }}>
                              <tbody>
                                {[
                                  ['Archived By',  y.archived_by_name],
                                  ['Archived On',  new Date(y.archived_at).toLocaleString('en-IN')],
                                  ['Year Covered', y.archive_year],
                                ].map(([k, v]) => (
                                  <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '.5rem .25rem', fontWeight: 600, color: '#6b7280', width: '40%' }}>{k}</td>
                                    <td style={{ padding: '.5rem .25rem' }}>{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}

                {/* Registrations tab */}
                {activeTab === 'registrations' && (
                  <div className="card">
                    {regs.length === 0 ? (
                      <div className="empty-state">No registrations archived for {selectedYear}.</div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Trainee ID</th>
                              <th>Type</th>
                              <th>Mess</th>
                              <th>Reg Date</th>
                              <th>Expiry</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regs.map(r => (
                              <tr key={r.id}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{r.user_name}</div>
                                  <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{r.user_email}</div>
                                </td>
                                <td style={{ fontSize: '.83rem' }}>{r.user_trainee_id || '—'}</td>
                                <td>
                                  <span className={`badge ${r.user_member_type === 'Mess Only' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '.7rem' }}>
                                    {r.user_member_type || 'Hostel'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '.83rem' }}>{r.mess_type}</td>
                                <td style={{ fontSize: '.8rem' }}>{r.registration_date}</td>
                                <td style={{ fontSize: '.8rem' }}>{r.expiry_date}</td>
                                <td>
                                  <span className={`badge ${r.approval_status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                                    {r.approval_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ fontSize: '.78rem', color: '#9ca3af', textAlign: 'right', marginTop: '.5rem' }}>
                          {regs.length} records
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback tab */}
                {activeTab === 'feedback' && (
                  <>
                    {fbStats && feedback.length > 0 && (
                      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="stat-card"><div className="stat-label">Total Feedback</div><div className="stat-value">{fbStats.total}</div></div>
                        <div className="stat-card"><div className="stat-label">Avg Rating</div><div className="stat-value" style={{ color: '#f59e0b' }}>{fbStats.avg_rating || '—'} ★</div></div>
                        <div className="stat-card"><div className="stat-label">5 Star Reviews</div><div className="stat-value" style={{ color: '#16a34a' }}>{fbStats.five_star || 0}</div></div>
                      </div>
                    )}
                    <div className="card">
                      {feedback.length === 0 ? (
                        <div className="empty-state">No feedback archived for {selectedYear}.</div>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr><th>Name</th><th>Rating</th><th>Category</th><th>Comments</th><th>Date</th></tr>
                            </thead>
                            <tbody>
                              {feedback.map(f => (
                                <tr key={f.id}>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{f.user_name}</div>
                                    <div style={{ fontSize: '.72rem', color: '#9ca3af' }}>{f.user_email}</div>
                                  </td>
                                  <td>
                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(f.rating)}</span>
                                    <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - f.rating)}</span>
                                  </td>
                                  <td><span className="badge badge-info" style={{ fontSize: '.7rem' }}>{f.category}</span></td>
                                  <td style={{ maxWidth: 250, fontSize: '.82rem' }}>{f.comments || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                                  <td style={{ fontSize: '.78rem', color: '#6b7280' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ fontSize: '.78rem', color: '#9ca3af', textAlign: 'right', marginTop: '.5rem' }}>
                            {feedback.length} records
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {loading && years.length > 0 && (
              <div className="loading"><div className="spinner" /></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}