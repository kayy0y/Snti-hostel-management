import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAnalytics } from '../../utils/api';
import toast from 'react-hot-toast';

const BarChart = ({ data, color='#1e40af' }) => {
  if (!data?.length) return <div style={{ color:'#9ca3af', fontSize:'.8rem' }}>No data this week.</div>;
  const max = Math.max(...data.map(d => d.count));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'.4rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'.65rem' }}>
          <div style={{ width:130, fontSize:'.78rem', color:'#374151', textAlign:'right', flexShrink:0 }}>{d.item || d.day || d.date}</div>
          <div style={{ flex:1, background:'#f3f4f6', borderRadius:99, height:16, position:'relative' }}>
            <div style={{ width:`${(d.count/max)*100}%`, background:color, borderRadius:99, height:'100%', transition:'width .4s', minWidth:4 }} />
          </div>
          <div style={{ width:28, fontSize:'.78rem', fontWeight:700, color, flexShrink:0 }}>{d.count}</div>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data,   setData]   = useState(null);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    getAnalytics().then(r => setData(r.data.data)).catch(() => toast.error('Failed.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>;
  if (!data) return <div className="page"><Navbar /><div className="loading">No data available.</div></div>;

  const cov = data.menu_coverage;
  const pct = cov.total_students ? Math.round((cov.selected_this_week/cov.total_students)*100) : 0;

  return (
    <div className="page"><Navbar />
      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Food Analytics</h2>
          <span style={{ fontSize:'.8rem', color:'#6b7280' }}>Week of {data.week_start}</span>
        </div>

        <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
          <div className="stat-card"><div className="stat-label">Menu Coverage</div><div className="stat-value">{pct}%</div><div style={{ fontSize:'.75rem', color:'#6b7280' }}>{cov.selected_this_week}/{cov.total_students} members</div></div>
          <div className="stat-card"><div className="stat-label">Pending Approvals</div><div className="stat-value" style={{ color:data.pending_approvals>0?'#dc2626':'#16a34a' }}>{data.pending_approvals}</div></div>
        </div>

        {/* Menu popularity */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:'1.25rem', marginBottom:'1.25rem' }}>
          {[{meal:'Breakfast',color:'#f59e0b',key:'breakfast'},{meal:'Lunch',color:'#16a34a',key:'lunch'},{meal:'Dinner',color:'#1e40af',key:'dinner'}].map(({meal,color,key}) => (
            <div className="card" key={meal}>
              <div className="card-title">{meal} — Most Popular</div>
              <BarChart data={data.menu_popularity[key]?.top} color={color} />
              {data.menu_popularity[key]?.low?.length > 0 && (
                <><div style={{ fontSize:'.75rem', color:'#9ca3af', margin:'.65rem 0 .35rem', fontWeight:600 }}>Least Selected</div><BarChart data={data.menu_popularity[key]?.low} color='#d1d5db' /></>
              )}
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
          <div className="card"><div className="card-title">Registration Trend (30 days)</div>
            {data.registration_trend?.length > 0
              ? <BarChart data={data.registration_trend.map(r => ({item:r.date, count:r.count}))} color='#1e40af' />
              : <div style={{ color:'#9ca3af', fontSize:'.83rem' }}>No recent registrations.</div>}
          </div>
          <div className="card"><div className="card-title">Peak Registration Days</div>
            <BarChart data={data.peak_day?.map(d => ({item:d.day, count:d.count}))} color='#7c3aed' />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
          <div className="card"><div className="card-title">Member Breakdown</div>
            {data.member_breakdown?.map(m => (
              <div key={m.member_type} style={{ display:'flex', justifyContent:'space-between', padding:'.5rem 0', borderBottom:'1px solid #f3f4f6', fontSize:'.86rem' }}>
                <span>{m.member_type || 'Unknown'}</span><strong>{m.count}</strong>
              </div>
            ))}
          </div>
          <div className="card"><div className="card-title">Coverage Progress</div>
            <div style={{ fontSize:'.83rem', color:'#6b7280', marginBottom:'.75rem' }}>{cov.selected_this_week} of {cov.total_students} members selected this week's menu</div>
            <div className="progress-bar" style={{ height:18 }}>
              <div className={`progress-fill ${pct===100?'complete':''}`} style={{ width:`${pct}%` }} />
            </div>
            <div style={{ textAlign:'right', fontSize:'.78rem', color:'#6b7280', marginTop:'.3rem' }}>{pct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
