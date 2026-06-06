import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getSettings, updateSettings } from '../../utils/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [form,   setForm]   = useState({ upi_id:'', mess_monthly_fee:'1500' });
  const [qr,     setQr]     = useState(null);
  const [loading,setLoading]= useState(true);
  const [saving, setSaving] = useState(false);

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
      </div>
    </div>
  );
}
