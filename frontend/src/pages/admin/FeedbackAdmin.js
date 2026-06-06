import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAllFeedback } from '../../utils/api';
import toast from 'react-hot-toast';

const Bar = ({ label, count, total, color='#1e40af' }) => {
  const pct = total ? Math.round((count/total)*100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.4rem' }}>
      <span style={{ width:48, fontSize:'.8rem', color:'#374151', textAlign:'right', flexShrink:0 }}>{label} ★</span>
      <div style={{ flex:1, background:'#f3f4f6', borderRadius:99, height:10 }}>
        <div style={{ width:`${pct}%`, background:color, borderRadius:99, height:'100%', transition:'width .4s' }} />
      </div>
      <span style={{ width:32, fontSize:'.78rem', fontWeight:600, color, flexShrink:0 }}>{count}</span>
    </div>
  );
};

const CATS = ['All','Food Quality','Cleanliness','Service','Variety','Other'];

export default function FeedbackAdmin() {
  const [data,  setData]  = useState([]);
  const [stats, setStats] = useState(null);
  const [loading,setLoading]=useState(true);
  const [filter, setFilter]=useState('All');

  useEffect(() => {
    getAllFeedback().then(r => { setData(r.data.data); setStats(r.data.analytics); }).catch(() => toast.error('Failed.')).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? data : data.filter(f => f.category === filter);

  return (
    <div className="page"><Navbar />
      <div className="main">
        <div className="section-header"><h2 className="section-title">Feedback & Analytics</h2></div>

        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.5rem' }}>
            <div className="card">
              <div className="card-title">Rating Summary</div>
              <div style={{ display:'flex', gap:'2rem', marginBottom:'1rem' }}>
                <div><div style={{ fontSize:'2.5rem', fontWeight:800, color:'#f59e0b' }}>{stats.avg_rating || '—'}</div><div style={{ fontSize:'.78rem', color:'#6b7280' }}>Avg Rating</div></div>
                <div><div style={{ fontSize:'2.5rem', fontWeight:800, color:'#1e40af' }}>{stats.total}</div><div style={{ fontSize:'.78rem', color:'#6b7280' }}>Total Reviews</div></div>
              </div>
              {[5,4,3,2,1].map(s => <Bar key={s} label={s} count={Number(stats[['','one','two','three','four','five'][s]+'_star'])||0} total={stats.total} color={s>=4?'#16a34a':s===3?'#f59e0b':'#dc2626'} />)}
            </div>
            <div className="card">
              <div className="card-title">Rating Distribution</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem', marginTop:'.5rem' }}>
                {[{l:'Excellent (5★)',v:stats.five_star,c:'#16a34a'},{l:'Good (4★)',v:stats.four_star,c:'#65a30d'},{l:'Average (3★)',v:stats.three_star,c:'#ca8a04'},{l:'Poor (≤2★)',v:Number(stats.two_star||0)+Number(stats.one_star||0),c:'#dc2626'}].map(({l,v,c}) => (
                  <div key={l} style={{ background:'#f9fafb', borderRadius:8, padding:'.7rem', textAlign:'center' }}>
                    <div style={{ fontSize:'1.5rem', fontWeight:800, color:c }}>{v||0}</div>
                    <div style={{ fontSize:'.72rem', color:'#6b7280' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'1rem' }}>
          {CATS.map(c => <button key={c} className={`btn btn-sm ${filter===c?'btn-primary':'btn-outline'}`} onClick={() => setFilter(c)}>{c}</button>)}
        </div>

        <div className="card">
          {loading ? <div className="loading"><div className="spinner" /></div> : filtered.length === 0 ? (
            <div className="empty-state">No feedback yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Rating</th><th>Category</th><th>Comments</th><th>Date</th></tr></thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id}>
                      <td><div style={{ fontWeight:600 }}>{f.name}</div><div style={{ fontSize:'.72rem', color:'#9ca3af' }}>{f.hostel_block}</div></td>
                      <td><span style={{ color:'#f59e0b', fontWeight:700, fontSize:'1rem' }}>{'★'.repeat(f.rating)}</span><span style={{ color:'#e5e7eb' }}>{'★'.repeat(5-f.rating)}</span></td>
                      <td><span className="badge badge-info" style={{ fontSize:'.7rem' }}>{f.category}</span></td>
                      <td style={{ maxWidth:260, fontSize:'.83rem' }}>{f.comments || <span style={{ color:'#9ca3af' }}>—</span>}</td>
                      <td style={{ fontSize:'.78rem', color:'#6b7280' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</td>
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
