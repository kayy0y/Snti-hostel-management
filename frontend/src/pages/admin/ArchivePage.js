import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import {
  runArchive, getArchiveYears,
  getArchivedRegistrations, getArchivedFeedback,
  exportArchive, deleteArchive,
} from '../../utils/api';
import toast from 'react-hot-toast';

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
};

// Build sidebar: last 5 years, each enriched with archive_log data
const buildYearList = (archivedLogs) => {
  return Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i).map(year => {
    const entries = archivedLogs.filter(a => Number(a.archive_year) === year);
    const totalRegs = entries.reduce((s, e) => s + Number(e.registrations_archived), 0);
    const totalFb   = entries.reduce((s, e) => s + Number(e.feedback_archived), 0);
    return {
      year,
      isArchived: entries.length > 0,
      totalRegs,
      totalFb,
      lastArchivedAt:   entries[0]?.archived_at || null,
      lastArchivedByName: entries[0]?.archived_by_name || null,
      logId: entries[0]?.log_id || null,
    };
  });
};

export default function ArchivePage() {
  const [archivedLogs,  setArchivedLogs]  = useState([]);
  const [yearList,      setYearList]      = useState([]);
  const [selectedYear,  setSelectedYear]  = useState(null);
  const [selectedMeta,  setSelectedMeta]  = useState(null);
  const [regs,          setRegs]          = useState([]);
  const [feedback,      setFeedback]      = useState([]);
  const [fbStats,       setFbStats]       = useState(null);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [pageLoading,   setPageLoading]   = useState(true);
  const [dataLoading,   setDataLoading]   = useState(false);
  const [archiving,     setArchiving]     = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);

  // Month+year picker state
  const [archiveMonth,  setArchiveMonth]  = useState(CURRENT_MONTH === 1 ? 12 : CURRENT_MONTH - 1);
  const [archiveYear,   setArchiveYear]   = useState(CURRENT_MONTH === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR);

  useEffect(() => {
    loadArchiveLog().finally(() => setPageLoading(false));
  }, []);

  const loadArchiveLog = async () => {
    try {
      const r  = await getArchiveYears();
      const logs = r.data.data;
      setArchivedLogs(logs);
      setYearList(buildYearList(logs));
    } catch { toast.error('Failed to load archive info.'); }
  };

  const loadYearData = async (year) => {
    setDataLoading(true);
    setRegs([]); setFeedback([]); setFbStats(null);
    try {
      const [rRes, fRes] = await Promise.all([
        getArchivedRegistrations(year),
        getArchivedFeedback(year),
      ]);
      setRegs(rRes.data.data);
      setFeedback(fRes.data.data);
      setFbStats(fRes.data.stats);
    } catch { toast.error('Failed to load archive data.'); }
    finally { setDataLoading(false); }
  };

  const handleYearSelect = (entry) => {
    setSelectedYear(entry.year);
    setSelectedMeta(entry);
    setActiveTab('overview');
    if (entry.isArchived) loadYearData(entry.year);
    else { setRegs([]); setFeedback([]); setFbStats(null); }
  };

  const handleRunArchive = async () => {
    setArchiving(true);
    setShowConfirm(false);
    try {
      const r = await runArchive(archiveMonth, archiveYear);
      toast.success(r.data.message);
      await loadArchiveLog();
      setSelectedYear(archiveYear);
      setActiveTab('overview');
      await loadYearData(archiveYear);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Archive failed.');
    } finally { setArchiving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r   = await exportArchive(selectedYear);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a   = document.createElement('a');
      a.href = url; a.download = `snti_archive_${selectedYear}.xlsx`; a.click();
      toast.success(`Archive ${selectedYear} downloaded.`);
    } catch { toast.error('Export failed.'); }
    finally { setExporting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowDelete(false);
    try {
      const r = await deleteArchive(selectedYear);
      toast.success(r.data.message);
      setSelectedYear(null);
      setSelectedMeta(null);
      setRegs([]); setFeedback([]); setFbStats(null);
      await loadArchiveLog();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally { setDeleting(false); }
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
          <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
            {selectedMeta?.isArchived && (
              <>
                <button className="btn btn-success btn-sm" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporting…' : `Export ${selectedYear}`}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)} disabled={deleting}>
                  {deleting ? 'Deleting…' : `Delete Archive`}
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowConfirm(true)} disabled={archiving}>
              {archiving ? 'Archiving…' : 'Archive Now'}
            </button>
          </div>
        </div>

        {/* Archive Now confirmation dialog — month + year picker */}
        {showConfirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:'2rem', maxWidth:460, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight:800, color:'#1e40af', marginBottom:'.75rem' }}>Archive Data</h3>
              <p style={{ fontSize:'.88rem', color:'#374151', marginBottom:'1.25rem', lineHeight:1.6 }}>
                Select the month and year to archive. All registrations and feedback
                created in that period will be moved to archive tables and
                <strong> deleted from active tables</strong>. User accounts are kept.
                This cannot be undone.
              </p>

              {/* Month + Year picker */}
              <div className="form-row" style={{ marginBottom:'1.25rem' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Month</label>
                  <select className="form-control" value={archiveMonth} onChange={e => setArchiveMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Year</label>
                  <select className="form-control" value={archiveYear} onChange={e => setArchiveYear(Number(e.target.value))}>
                    {Array.from({ length:5 }, (_, i) => CURRENT_YEAR - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="alert alert-danger" style={{ fontSize:'.82rem' }}>
                Data from <strong>{MONTHS[archiveMonth-1]} {archiveYear}</strong> will be permanently moved to archive.
              </div>

              <div style={{ display:'flex', gap:'.75rem', marginTop:'1rem' }}>
                <button className="btn btn-outline btn-full" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={handleRunArchive} disabled={archiving}>
                  {archiving ? 'Archiving…' : `Archive ${MONTHS[archiveMonth-1]} ${archiveYear}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        {showDelete && selectedYear && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:'2rem', maxWidth:420, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.2)' }}>
              <h3 style={{ fontWeight:800, color:'#dc2626', marginBottom:'.75rem' }}>Delete Archive</h3>
              <p style={{ fontSize:'.88rem', color:'#374151', marginBottom:'1rem', lineHeight:1.6 }}>
                This will permanently delete ALL archived records for <strong>{selectedYear}</strong>.
                This cannot be undone.
              </p>
              <div className="alert alert-danger" style={{ fontSize:'.82rem' }}>
                {selectedMeta?.totalRegs} registrations and {selectedMeta?.totalFb} feedback records will be deleted.
              </div>
              <div style={{ display:'flex', gap:'.75rem', marginTop:'1rem' }}>
                <button className="btn btn-outline btn-full" onClick={() => setShowDelete(false)}>Cancel</button>
                <button className="btn btn-danger btn-full" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : `Delete ${selectedYear} Archive`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display:'grid', gridTemplateColumns:'210px 1fr', gap:'1.25rem', alignItems:'start' }}>

          {/* Sidebar */}
          <div className="card" style={{ padding:'1rem' }}>
            <div style={{ fontWeight:700, fontSize:'.78rem', color:'#6b7280', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'.75rem' }}>
              Years
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              {yearList.map(entry => (
                <button
                  key={entry.year}
                  onClick={() => handleYearSelect(entry)}
                  style={{
                    padding:'.5rem .75rem', borderRadius:8, border:'none', cursor:'pointer',
                    background: selectedYear === entry.year ? '#dbeafe' : '#f9fafb',
                    color:      selectedYear === entry.year ? '#1e40af' : '#374151',
                    fontWeight: selectedYear === entry.year ? 700 : 500,
                    fontSize:'.85rem', textAlign:'left', transition:'all .12s',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>{entry.year}</span>
                    {entry.isArchived
                      ? <span style={{ fontSize:'.68rem', background:'#dcfce7', color:'#15803d', borderRadius:99, padding:'0 .4rem', fontWeight:700 }}>Archived</span>
                      : <span style={{ fontSize:'.68rem', background:'#f3f4f6', color:'#9ca3af', borderRadius:99, padding:'0 .4rem' }}>Not yet</span>
                    }
                  </div>
                  {entry.isArchived && (
                    <div style={{ fontSize:'.7rem', color:'#9ca3af', fontWeight:400, marginTop:'.15rem' }}>
                      {entry.totalRegs} regs · {entry.totalFb} fb
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            {!selectedYear && (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize:'3rem', marginBottom:'.75rem' }}>🗄️</div>
                  <p style={{ fontWeight:600 }}>Select a year from the sidebar</p>
                  <p style={{ fontSize:'.82rem', color:'#9ca3af', marginTop:'.4rem' }}>
                    Click "Archive Now" to archive data for a specific month and year.
                  </p>
                </div>
              </div>
            )}

            {selectedYear && selectedMeta && !selectedMeta.isArchived && (
              <div className="card">
                <div className="empty-state">
                  <div style={{ fontSize:'3rem', marginBottom:'.75rem' }}>📭</div>
                  <p style={{ fontWeight:600 }}>No archive for {selectedYear}</p>
                  <p style={{ fontSize:'.85rem', color:'#6b7280', marginTop:'.5rem', maxWidth:360, margin:'.5rem auto 0' }}>
                    No data from {selectedYear} has been archived yet.
                    Click <strong>"Archive Now"</strong> and select a month from {selectedYear}.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop:'1.25rem' }}
                    onClick={() => { setArchiveYear(selectedYear); setShowConfirm(true); }}
                  >
                    Archive a Month from {selectedYear}
                  </button>
                </div>
              </div>
            )}

            {selectedYear && selectedMeta?.isArchived && (
              <>
                <div style={{ display:'flex', gap:'.4rem', marginBottom:'1rem' }}>
                  {['overview','registrations','feedback'].map(tab => (
                    <button key={tab} className={`btn btn-sm ${activeTab===tab?'btn-primary':'btn-outline'}`} onClick={() => setActiveTab(tab)}>
                      {tab.charAt(0).toUpperCase()+tab.slice(1)}
                    </button>
                  ))}
                </div>

                {dataLoading && <div className="loading"><div className="spinner" /></div>}

                {!dataLoading && activeTab === 'overview' && (
                  <>
                    <div className="stats-grid" style={{ marginBottom:'1.25rem' }}>
                      <div className="stat-card"><div className="stat-label">Registrations</div><div className="stat-value">{selectedMeta.totalRegs}</div></div>
                      <div className="stat-card"><div className="stat-label">Feedback</div><div className="stat-value">{selectedMeta.totalFb}</div></div>
                      <div className="stat-card"><div className="stat-label">Year</div><div className="stat-value">{selectedYear}</div></div>
                    </div>
                    <div className="card">
                      <div className="card-title">Archive Info</div>
                      <table style={{ width:'100%', fontSize:'.88rem' }}>
                        <tbody>
                          {[
                            ['Last Archived By', selectedMeta.lastArchivedByName],
                            ['Last Archived On', selectedMeta.lastArchivedAt ? new Date(selectedMeta.lastArchivedAt).toLocaleString('en-IN') : '—'],
                          ].map(([k,v]) => (
                            <tr key={k} style={{ borderBottom:'1px solid #f3f4f6' }}>
                              <td style={{ padding:'.5rem .25rem', fontWeight:600, color:'#6b7280', width:'40%' }}>{k}</td>
                              <td style={{ padding:'.5rem .25rem' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {!dataLoading && activeTab === 'registrations' && (
                  <div className="card">
                    {regs.length === 0
                      ? <div className="empty-state">No registrations archived for {selectedYear}.</div>
                      : (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Name</th><th>Trainee ID</th><th>Type</th><th>Mess</th><th>Reg Date</th><th>Expiry</th><th>Status</th></tr></thead>
                            <tbody>
                              {regs.map(r => (
                                <tr key={r.id}>
                                  <td><div style={{ fontWeight:600 }}>{r.user_name}</div><div style={{ fontSize:'.72rem', color:'#9ca3af' }}>{r.user_email}</div></td>
                                  <td style={{ fontSize:'.83rem' }}>{r.user_trainee_id || '—'}</td>
                                  <td><span className={`badge ${r.user_member_type==='Mess Only'?'badge-warning':'badge-info'}`} style={{ fontSize:'.7rem' }}>{r.user_member_type||'Hostel'}</span></td>
                                  <td style={{ fontSize:'.83rem' }}>{r.mess_type}</td>
                                  <td style={{ fontSize:'.8rem' }}>{fmtDate(r.registration_date)}</td>
                                  <td style={{ fontSize:'.8rem' }}>{fmtDate(r.expiry_date)}</td>
                                  <td><span className={`badge ${r.approval_status==='approved'?'badge-success':'badge-danger'}`}>{r.approval_status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ fontSize:'.75rem', color:'#9ca3af', textAlign:'right', marginTop:'.5rem' }}>{regs.length} records</div>
                        </div>
                      )
                    }
                  </div>
                )}

                {!dataLoading && activeTab === 'feedback' && (
                  <>
                    {fbStats && feedback.length > 0 && (
                      <div className="stats-grid" style={{ marginBottom:'1.25rem' }}>
                        <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{fbStats.total}</div></div>
                        <div className="stat-card"><div className="stat-label">Avg Rating</div><div className="stat-value" style={{ color:'#f59e0b' }}>{fbStats.avg_rating||'—'} ★</div></div>
                        <div className="stat-card"><div className="stat-label">5 Star</div><div className="stat-value" style={{ color:'#16a34a' }}>{fbStats.five_star||0}</div></div>
                      </div>
                    )}
                    <div className="card">
                      {feedback.length === 0
                        ? <div className="empty-state">No feedback archived for {selectedYear}.</div>
                        : (
                          <div className="table-wrap">
                            <table>
                              <thead><tr><th>Name</th><th>Rating</th><th>Category</th><th>Comments</th><th>Date</th></tr></thead>
                              <tbody>
                                {feedback.map(f => (
                                  <tr key={f.id}>
                                    <td><div style={{ fontWeight:600 }}>{f.user_name}</div><div style={{ fontSize:'.72rem', color:'#9ca3af' }}>{f.user_email}</div></td>
                                    <td><span style={{ color:'#f59e0b', fontWeight:700 }}>{'★'.repeat(f.rating)}</span><span style={{ color:'#e5e7eb' }}>{'★'.repeat(5-f.rating)}</span></td>
                                    <td><span className="badge badge-info" style={{ fontSize:'.7rem' }}>{f.category}</span></td>
                                    <td style={{ maxWidth:250, fontSize:'.82rem' }}>{f.comments||<span style={{ color:'#9ca3af' }}>—</span>}</td>
                                    <td style={{ fontSize:'.78rem', color:'#6b7280' }}>{fmtDate(f.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{ fontSize:'.75rem', color:'#9ca3af', textAlign:'right', marginTop:'.5rem' }}>{feedback.length} records</div>
                          </div>
                        )
                      }
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