import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import {
  runArchive, getArchiveYears,
  getArchivedRegistrations, getArchivedFeedback, exportArchive,
} from '../../utils/api';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();

// Build the sidebar year list: last 5 years always shown
// Each entry is enriched with archive_log data if it exists
const buildYearList = (archivedYears) => {
  return Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i).map(year => {
    const archived = archivedYears.find(a => Number(a.archive_year) === year);
    return {
      year,
      isArchived:            !!archived,
      registrations_archived: archived?.registrations_archived || 0,
      feedback_archived:      archived?.feedback_archived      || 0,
      archived_at:            archived?.archived_at            || null,
      archived_by_name:       archived?.archived_by_name       || null,
    };
  });
};

export default function ArchivePage() {
  const [archivedYears, setArchivedYears]   = useState([]); // from archive_log
  const [yearList,      setYearList]        = useState([]); // sidebar list (all 5 years)
  const [selectedYear,  setSelectedYear]    = useState(null);
  const [selectedMeta,  setSelectedMeta]    = useState(null); // archive_log row for selected year
  const [regs,          setRegs]            = useState([]);
  const [feedback,      setFeedback]        = useState([]);
  const [fbStats,       setFbStats]         = useState(null);
  const [activeTab,     setActiveTab]       = useState('overview');
  const [pageLoading,   setPageLoading]     = useState(true);
  const [dataLoading,   setDataLoading]     = useState(false);
  const [archiving,     setArchiving]       = useState(false);
  const [exporting,     setExporting]       = useState(false);
  const [yearToArchive, setYearToArchive]   = useState(CURRENT_YEAR - 1);
  const [showConfirm,   setShowConfirm]     = useState(false);

  // On mount: only load archive_log — never auto-load archived data
  useEffect(() => {
    loadArchiveLog().finally(() => setPageLoading(false));
  }, []);

  const loadArchiveLog = async () => {
    try {
      const r  = await getArchiveYears();
      const ay = r.data.data;
      setArchivedYears(ay);
      setYearList(buildYearList(ay));
    } catch {
      toast.error('Failed to load archive info.');
    }
  };

  // Load actual archived rows — only called when admin clicks a year that IS archived
  const loadYearData = async (year) => {
    setDataLoading(true);
    setRegs([]);
    setFeedback([]);
    setFbStats(null);
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
      setDataLoading(false);
    }
  };

  const handleYearSelect = (entry) => {
    setSelectedYear(entry.year);
    setSelectedMeta(entry);
    setActiveTab('overview');
    // Only fetch data if this year has actually been archived
    if (entry.isArchived) {
      loadYearData(entry.year);
    } else {
      setRegs([]);
      setFeedback([]);
      setFbStats(null);
    }
  };

  const handleRunArchive = async () => {
    setArchiving(true);
    setShowConfirm(false);
    try {
      const r = await runArchive(yearToArchive);
      toast.success(r.data.message);
      await loadArchiveLog();
      // Select the just-archived year and load its data
      setSelectedYear(yearToArchive);
      setActiveTab('overview');
      await loadYearData(yearToArchive);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed.');
    } finally {
      setArchiving(false);
    }
  };

  const handleExport = async () => {
    if (!selectedYear || !selectedMeta?.isArchived) return;
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

  if (pageLoading) return (
    <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>
  );

  return (
    <div className="page">
      <Navbar />
      <div className="main">

        {/* Header */}
        <div className="section-header">
          <h2 className="section-title">Archive</h2>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedMeta?.isArchived && (
              <button
                className="btn btn-success btn-sm"
                onClick={handleExport}
                disabled={exporting}
              >
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

        {/* Confirm dialog */}
        {showConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '2rem', maxWidth: 440, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight: 800, color: '#dc2626', marginBottom: '.75rem' }}>Confirm Archive</h3>
              <p style={{ fontSize: '.88rem', color: '#374151', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                This moves all registrations and feedback from the selected year into
                archive tables and <strong>deletes them from active tables</strong>.
                User accounts are kept. This cannot be undone.
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
                All data from <strong>{yearToArchive}</strong> will be permanently moved to archive.
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

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* Sidebar — always shows last 5 years */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.75rem' }}>
              Years
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              {yearList.map(entry => (
                <button
                  key={entry.year}
                  onClick={() => handleYearSelect(entry)}
                  style={{
                    padding: '.5rem .75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: selectedYear === entry.year ? '#dbeafe' : '#f9fafb',
                    color:      selectedYear === entry.year ? '#1e40af' : '#374151',
                    fontWeight: selectedYear === entry.year ? 700 : 500,
                    fontSize: '.85rem', textAlign: 'left', transition: 'all .12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{entry.year}</span>
                    {entry.isArchived
                      ? <span style={{ fontSize: '.68rem', background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '0 .4rem', fontWeight: 700 }}>Archived</span>
                      : <span style={{ fontSize: '.68rem', background: '#f3f4f6', color: '#9ca3af', borderRadius: 99, padding: '0 .4rem' }}>Not yet</span>
                    }
                  </div>
                  {entry.isArchived && (
                    <div style={{ fontSize: '.7rem', color: '#9ca3af', fontWeight: 400, marginTop: '.15rem' }}>
                      {entry.registrations_archived} regs · {entry.feedback_archived} fb
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div>
            {/* Nothing selected yet */}
            {!selectedYear && (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🗄️</div>
                  <p style={{ fontWeight: 600 }}>Select a year from the sidebar</p>
                  <p style={{ fontSize: '.82rem', color: '#9ca3af', marginTop: '.4rem' }}>
                    Click "Archive Now" to archive data from a past year.
                  </p>
                </div>
              </div>
            )}

            {/* Year selected but NOT archived yet */}
            {selectedYear && selectedMeta && !selectedMeta.isArchived && (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>📭</div>
                  <p style={{ fontWeight: 600 }}>No archive for {selectedYear}</p>
                  <p style={{ fontSize: '.85rem', color: '#6b7280', marginTop: '.5rem', maxWidth: 360, margin: '.5rem auto 0' }}>
                    Data from {selectedYear} has not been archived yet.
                    Click <strong>"Archive Now"</strong> and select <strong>{selectedYear}</strong> to archive it.
                  </p>
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: '1.25rem' }}
                    onClick={() => { setYearToArchive(selectedYear); setShowConfirm(true); }}
                  >
                    Archive {selectedYear} Now
                  </button>
                </div>
              </div>
            )}

            {/* Year selected AND archived — show tabs + data */}
            {selectedYear && selectedMeta?.isArchived && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1rem' }}>
                  {['overview', 'registrations', 'feedback'].map(tab => (
                    <button
                      key={tab}
                      className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {dataLoading && <div className="loading"><div className="spinner" /></div>}

                {/* Overview tab */}
                {!dataLoading && activeTab === 'overview' && (
                  <>
                    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                      <div className="stat-card">
                        <div className="stat-label">Registrations Archived</div>
                        <div className="stat-value">{selectedMeta.registrations_archived}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Feedback Archived</div>
                        <div className="stat-value">{selectedMeta.feedback_archived}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Year</div>
                        <div className="stat-value">{selectedYear}</div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-title">Archive Info</div>
                      <table style={{ width: '100%', fontSize: '.88rem' }}>
                        <tbody>
                          {[
                            ['Archived By', selectedMeta.archived_by_name],
                            ['Archived On', selectedMeta.archived_at ? new Date(selectedMeta.archived_at).toLocaleString('en-IN') : '—'],
                            ['Year Covered', selectedYear],
                          ].map(([k, v]) => (
                            <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '.5rem .25rem', fontWeight: 600, color: '#6b7280', width: '40%' }}>{k}</td>
                              <td style={{ padding: '.5rem .25rem' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Registrations tab */}
                {!dataLoading && activeTab === 'registrations' && (
                  <div className="card">
                    {regs.length === 0 ? (
                      <div className="empty-state">No registrations archived for {selectedYear}.</div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th><th>Trainee ID</th><th>Type</th>
                              <th>Mess</th><th>Reg Date</th><th>Expiry</th><th>Status</th>
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
                        <div style={{ fontSize: '.75rem', color: '#9ca3af', textAlign: 'right', marginTop: '.5rem' }}>
                          {regs.length} records
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback tab */}
                {!dataLoading && activeTab === 'feedback' && (
                  <>
                    {fbStats && feedback.length > 0 && (
                      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="stat-card"><div className="stat-label">Total Feedback</div><div className="stat-value">{fbStats.total}</div></div>
                        <div className="stat-card"><div className="stat-label">Avg Rating</div><div className="stat-value" style={{ color: '#f59e0b' }}>{fbStats.avg_rating || '—'} ★</div></div>
                        <div className="stat-card"><div className="stat-label">5 Star</div><div className="stat-value" style={{ color: '#16a34a' }}>{fbStats.five_star || 0}</div></div>
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
                          <div style={{ fontSize: '.75rem', color: '#9ca3af', textAlign: 'right', marginTop: '.5rem' }}>
                            {feedback.length} records
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}