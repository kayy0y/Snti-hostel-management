import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getSettings, updateSettings, resetBatch } from '../../utils/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [form,        setForm]        = useState({ upi_id:'', mess_monthly_fee:'1500' });
  const [qr,          setQr]          = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [showReset,   setShowReset]   = useState(false);
  const [archiveBatch,setArchiveBatch]= useState(true);
  const [resetting,   setResetting]   = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    getSettings().then(r => {
      const d = r.data.data;
      setForm({ upi_id: d.upi_id||'', mess_monthly_fee: d.mess_monthly_fee||'1500' });
      if (d.upi_qr) setQr(d.upi_qr);
    }).catch(() => toast.error('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success('Settings saved.');
      const r = await getSettings();
      if (r.data.data.upi_qr) setQr(r.data.data.upi_qr);
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleQRUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { toast.error('File must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setQr(reader.result);
      try { await updateSettings({ upi_qr_image: reader.result }); toast.success('QR image uploaded.'); }
      catch { toast.error('Failed to upload QR.'); }
    };
    reader.readAsDataURL(file);
  };

  const handleResetBatch = async () => {
    if (confirmText !== 'RESET BATCH') {
      toast.error('Please type RESET BATCH to confirm.');
      return;
    }
    setResetting(true);
    try {
      const r = await resetBatch(archiveBatch);
      toast.success(r.data.message);
      setShowReset(false);
      setConfirmText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>;

  return (
    <div className="page"><Navbar />
      <div className="main" style={{ maxWidth:680 }}>
        <div className="section-header"><h2 className="section-title">Settings</h2></div>

        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div className="card-title">Payment Settings</div>
          <p style={{ fontSize:'.83rem', color:'#6b7280', marginBottom:'1rem' }}>
            These values are shown to external members during registration. The UPI ID is used to auto-generate a payment QR.
          </p>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">UPI ID</label>
                <input className="form-control" placeholder="e.g. snti.mess@upi" value={form.upi_id} onChange={e => setForm(f => ({...f, upi_id:e.target.value}))} />
                <span style={{ fontSize:'.75rem', color:'#6b7280' }}>Used to generate dynamic QR. Overridden by static QR if uploaded.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Fee (INR)</label>
                <input type="number" className="form-control" value={form.mess_monthly_fee} onChange={e => setForm(f => ({...f, mess_monthly_fee:e.target.value}))} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Static UPI QR Image</div>
          <p style={{ fontSize:'.83rem', color:'#6b7280', marginBottom:'1rem' }}>
            Upload a static QR image from your UPI app. If uploaded, this takes priority over the auto-generated QR.
          </p>
          <div style={{ display:'flex', gap:'2rem', alignItems:'flex-start', flexWrap:'wrap' }}>
            <div>
              <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display:'none' }} id="qr-upload" />
              <label htmlFor="qr-upload" className="btn btn-outline" style={{ cursor:'pointer' }}>Upload QR Image</label>
              <div style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:'.4rem' }}>PNG or JPG, max 2MB</div>
            </div>
            {qr && (
              <div style={{ textAlign:'center' }}>
                <img src={qr} alt="UPI QR" style={{ width:140, height:140, borderRadius:8, border:'1px solid #e5e7eb' }} />
                <div style={{ fontSize:'.72rem', color:'#6b7280', marginTop:'.3rem' }}>Current QR</div>
                <button className="btn btn-danger btn-sm" style={{ marginTop:'.4rem' }} onClick={async () => { await updateSettings({ upi_qr_image: null }); setQr(null); toast.success('QR removed.'); }}>Remove</button>
              </div>
            )}
          </div>
        </div>
        {/* Reset Batch — Danger Zone */}
        <div className="card" style={{ border: '1.5px solid #fca5a5' }}>
          <div className="card-title" style={{ color: '#dc2626' }}>Danger Zone — Reset Batch</div>
          <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.6 }}>
            Permanently deletes <strong>all student and external member accounts</strong> along with
            their registrations, feedback, and menu selections.
            Admins, settings, and menu items are kept.
            Use this when starting a new batch.
          </p>
          <button
            className="btn btn-danger"
            onClick={() => { setShowReset(true); setConfirmText(''); }}
          >
            Reset Batch
          </button>
        </div>

        {/* Reset Batch confirm modal */}
        {showReset && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:14, padding:'2rem', maxWidth:460, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.25)' }}>
              <h3 style={{ fontWeight:800, color:'#dc2626', marginBottom:'.75rem' }}>Reset Batch</h3>
              <p style={{ fontSize:'.88rem', color:'#374151', marginBottom:'1.25rem', lineHeight:1.6 }}>
                This will permanently delete <strong>all student and external member accounts</strong>.
                This action cannot be undone.
              </p>

              {/* Archive checkbox */}
              <label style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'1.25rem', cursor:'pointer', fontSize:'.88rem', fontWeight:500 }}>
                <input
                  type="checkbox"
                  checked={archiveBatch}
                  onChange={e => setArchiveBatch(e.target.checked)}
                  style={{ width:16, height:16, cursor:'pointer' }}
                />
                Archive all student data before deleting
                <span style={{ fontSize:'.75rem', color:'#6b7280', fontWeight:400 }}>(recommended)</span>
              </label>

              {!archiveBatch && (
                <div className="alert alert-danger" style={{ fontSize:'.82rem', marginBottom:'1rem' }}>
                  No archive will be created. All data will be gone permanently.
                </div>
              )}

              {/* Must type RESET BATCH */}
              <div className="form-group" style={{ marginBottom:'1.25rem' }}>
                <label className="form-label">Type <strong>RESET BATCH</strong> to confirm</label>
                <input
                  className="form-control"
                  placeholder="RESET BATCH"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  autoFocus
                  style={{ borderColor: confirmText === 'RESET BATCH' ? '#16a34a' : '#e5e7eb' }}
                />
              </div>

              <div style={{ display:'flex', gap:'.75rem' }}>
                <button
                  className="btn btn-outline btn-full"
                  onClick={() => { setShowReset(false); setConfirmText(''); }}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleResetBatch}
                  disabled={resetting || confirmText !== 'RESET BATCH'}
                >
                  {resetting ? 'Resetting…' : 'Reset Batch'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}