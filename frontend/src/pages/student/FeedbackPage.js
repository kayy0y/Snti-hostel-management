import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { submitFeedback } from '../../utils/api';
import toast from 'react-hot-toast';

const CATS = ['Food Quality','Cleanliness','Service','Variety','Other'];
const LABELS = ['','Very Poor','Poor','Average','Good','Excellent'];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [form,      setForm]      = useState({ rating:0, category:'Food Quality', comments:'' });
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.rating) { toast.error('Please select a rating.'); return; }
    setLoading(true);
    try { await submitFeedback(form); setSubmitted(true); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page"><Navbar />
      <div className="main" style={{ maxWidth:520 }}>
        <div className="section-header"><h2 className="section-title">Feedback</h2></div>
        {submitted ? (
          <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
            <h3 style={{ fontWeight:800 }}>Thank you!</h3>
            <p style={{ color:'#6b7280', fontSize:'.88rem', marginTop:'.5rem' }}>Your feedback helps us improve the mess services.</p>
            <div style={{ display:'flex', gap:'1rem', justifyContent:'center', marginTop:'1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setSubmitted(false)}>Submit Another</button>
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Home</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Rating *</label>
                <div className="stars">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`star ${form.rating>=s?'active':''}`} onClick={() => setForm(f => ({...f, rating:s}))}>★</span>
                  ))}
                </div>
                {form.rating > 0 && <div style={{ fontSize:'.8rem', color:'#6b7280', marginTop:'.3rem' }}>{LABELS[form.rating]}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
                  {CATS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({...f, category:c}))} style={{
                      padding:'.3rem .85rem', borderRadius:99, fontSize:'.8rem', cursor:'pointer',
                      border:`2px solid ${form.category===c?'#1e40af':'#e5e7eb'}`,
                      background: form.category===c ? '#dbeafe' : '#fff',
                      color:      form.category===c ? '#1e40af' : '#374151',
                      fontWeight: form.category===c ? 700 : 400,
                    }}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comments</label>
                <textarea className="form-control" rows={4} placeholder="Tell us what you liked or what can be improved…" value={form.comments} onChange={e => setForm(f => ({...f, comments:e.target.value}))} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Submitting…' : 'Submit Feedback'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
