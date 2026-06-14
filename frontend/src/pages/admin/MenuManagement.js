import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getMenus, addMenuItem, deleteMenuItem, getWeeklyPlan, addItemToPlan, removeItemFromPlan, resetWeekPlan, getAvailableWeeks } from '../../utils/api';
import toast from 'react-hot-toast';

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS = ['Breakfast','Lunch','Dinner'];
const CAT   = { Veg:{ bg:'#dcfce7', c:'#15803d' }, 'Non-Veg':{ bg:'#fee2e2', c:'#dc2626' }, Special:{ bg:'#fef9c3', c:'#a16207' } };

// Returns this week's Monday as YYYY-MM-DD using LOCAL date parts
// (avoids UTC shift from toISOString())
const getMonday = () => {
  const n = new Date();
  const d = n.getDay();
  const m = new Date(n);
  m.setDate(n.getDate() + (d === 0 ? -6 : 1 - d));
  const yyyy = m.getFullYear();
  const mm   = String(m.getMonth() + 1).padStart(2, '0');
  const dd   = String(m.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
// Parses a YYYY-MM-DD string as a LOCAL date (avoids UTC midnight shift)
const parseLocalDate = ws => { const [y,m,d] = ws.split('-').map(Number); return new Date(y, m-1, d); };
const fmtWeek = ws => { if(!ws) return ''; const s=parseLocalDate(ws),e=parseLocalDate(ws); e.setDate(e.getDate()+6); return `${s.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`; };

export default function MenuManagement() {
  const [master,   setMaster]   = useState({ Breakfast:[], Lunch:[], Dinner:[] });
  const [plan,     setPlan]     = useState({});
  const weekStart                = getMonday(); // always the current week — no date picker, never changes
  const [isPlanSet,setIsPlanSet]= useState(false);
  const [pastWeeks,setPastWeeks]= useState([]);
  const [viewWeek, setViewWeek] = useState(null); // when set, viewing a past week (read-only)
  const [viewPlan, setViewPlan] = useState({});
  const [tab,      setTab]      = useState('weekly');
  const [selDay,   setSelDay]   = useState('Monday');
  const [loading,  setLoading]  = useState(true);
  const [masterForm,setMasterForm]=useState({ meal_type:'Breakfast', item_name:'', category:'Veg' });
  const [savingMaster,setSavingMaster]=useState(false);

  const loadPlan = useCallback(async ws => {
    const r = await getWeeklyPlan(ws);
    setPlan(r.data.data); setIsPlanSet(r.data.is_published);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [mr, wr] = await Promise.all([getMenus(), getAvailableWeeks()]);
        setMaster(mr.data.data); setPastWeeks(wr.data.data);
        await loadPlan(weekStart);
      } catch { toast.error('Failed to load.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const addToPlan = async (day, meal, menu_id) => {
    try { await addItemToPlan({ week_start: weekStart, day_name: day, meal_type: meal, menu_id }); await loadPlan(weekStart); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };
  const removeFromPlan = async pid => { try { await removeItemFromPlan(pid); await loadPlan(weekStart); } catch { toast.error('Failed.'); } };
  const resetWeek = async () => {
    if (!window.confirm(`Reset ALL menu items for ${fmtWeek(weekStart)}? Student selections will also be cleared.`)) return;
    try {
      const r = await resetWeekPlan({ week_start: weekStart });
      toast.success(r.data.message);
      await loadPlan(weekStart);
      const wr = await getAvailableWeeks();
      setPastWeeks(wr.data.data);
    }
    catch { toast.error('Reset failed.'); }
  };

  // View a past week's plan read-only (doesn't change weekStart — editing always stays on current week)
  const viewPastWeek = async (ws) => {
    try {
      const r = await getWeeklyPlan(ws);
      setViewPlan(r.data.data);
      setViewWeek(ws);
    } catch { toast.error('Failed to load that week.'); }
  };
  const backToCurrentWeek = () => { setViewWeek(null); };

  const addMaster = async e => {
    e.preventDefault();
    if (!masterForm.item_name.trim()) { toast.error('Item name required.'); return; }
    setSavingMaster(true);
    try { await addMenuItem(masterForm); toast.success('Item added.'); setMasterForm(f => ({...f, item_name:''})); const r = await getMenus(); setMaster(r.data.data); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSavingMaster(false); }
  };
  const delMaster = async (id, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    try { await deleteMenuItem(id); const r = await getMenus(); setMaster(r.data.data); }
    catch { toast.error('Failed.'); }
  };

  const slotCount   = (d, m) => plan[d]?.[m]?.length || 0;
  const totalFilled = () => DAYS.reduce((a,d) => a + MEALS.filter(m => slotCount(d,m)>0).length, 0);

  if (loading) return <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>;

  return (
    <div className="page"><Navbar />
      <div className="main">
        <div className="section-header">
          <h2 className="section-title">Menu Management</h2>
          <div style={{ display:'flex', gap:'.4rem' }}>
            <button className={`btn btn-sm ${tab==='weekly'?'btn-primary':'btn-outline'}`} onClick={() => setTab('weekly')}>Weekly Plan</button>
            <button className={`btn btn-sm ${tab==='master'?'btn-primary':'btn-outline'}`} onClick={() => setTab('master')}>Master Items</button>
          </div>
        </div>

        {/* Weekly Plan Tab */}
        {tab === 'weekly' && (
          <>
            <div className="card" style={{ marginBottom:'1.25rem', padding:'1rem 1.25rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                <div>
                  <div className="form-label" style={{ marginBottom: '.25rem' }}>Current Week</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>{fmtWeek(weekStart)}</div>
                </div>
                {isPlanSet && !viewWeek && <button className="btn btn-danger btn-sm" style={{ marginLeft:'auto' }} onClick={resetWeek}>Reset This Week</button>}
              </div>
              <div style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: '.6rem' }}>
                You can only set the menu for the current week. Once this week ends, the plan and student selections are automatically removed and a fresh week begins.
              </div>
              {!viewWeek && (
                <div style={{ marginTop:'.9rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'#6b7280', marginBottom:'.3rem' }}>
                    <span>{totalFilled()} / 21 slots have options</span><span>{Math.round((totalFilled()/21)*100)}%</span>
                  </div>
                  <div className="progress-bar"><div className={`progress-fill ${totalFilled()===21?'complete':''}`} style={{ width:`${(totalFilled()/21)*100}%` }} /></div>
                </div>
              )}
            </div>

            {pastWeeks.length > 0 && (
              <details style={{ marginBottom: '1rem' }}>
                <summary style={{ fontSize: '.82rem', color: '#6b7280', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                  View past weeks ({pastWeeks.length}) — read only
                </summary>
                <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap', marginTop: '.6rem', alignItems:'center' }}>
                  {pastWeeks.map(w => {
                    const ws = w.week_start.split('T')[0];
                    return (
                      <button key={ws} className={`btn btn-sm ${ws===viewWeek?'btn-primary':'btn-outline'}`} style={{ fontSize:'.72rem' }} onClick={() => viewPastWeek(ws)}>
                        {fmtWeek(ws)} ({w.item_count})
                      </button>
                    );
                  })}
                  {viewWeek && (
                    <button className="btn btn-sm btn-outline" style={{ fontSize:'.72rem' }} onClick={backToCurrentWeek}>
                      ← Back to current week
                    </button>
                  )}
                </div>
              </details>
            )}

            {viewWeek && (
              <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                Viewing {fmtWeek(viewWeek)} (read-only). Switch back to the current week to make changes.
              </div>
            )}


            {/* Day tabs */}
            <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'1rem' }}>
              {DAYS.map(d => {
                const displayPlan = viewWeek ? viewPlan : plan;
                const f = MEALS.filter(m => (displayPlan[d]?.[m]?.length || 0) > 0).length;
                return <button key={d} onClick={() => setSelDay(d)} style={{ padding:'.35rem .9rem', borderRadius:8, fontSize:'.83rem', cursor:'pointer', border:'none', background: selDay===d?'#1e40af':f===3?'#dcfce7':f>0?'#fef9c3':'#f3f4f6', color: selDay===d?'#fff':f===3?'#15803d':f>0?'#a16207':'#374151', fontWeight: selDay===d?700:500 }}>{d.slice(0,3)} {f===3?'(done)':f>0?`(${f}/3)`:''}</button>;
              })}
            </div>

            {/* 3 meal columns for selected day */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:'1rem' }}>
              {MEALS.map(meal => {
                const displayPlan = viewWeek ? viewPlan : plan;
                const items  = displayPlan[selDay]?.[meal] || [];
                const all    = master[meal] || [];
                const addedIds = new Set(items.map(i => i.menu_id));
                return (
                  <div className="card" key={meal}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.75rem' }}>
                      <span style={{ fontWeight:700, fontSize:'.92rem' }}>{meal}</span>
                      <span style={{ fontSize:'.72rem', color:'#6b7280' }}>{items.length} option{items.length!==1?'s':''}</span>
                    </div>
                    {items.length === 0
                      ? <div style={{ fontSize:'.8rem', color:'#9ca3af', background:'#f9fafb', borderRadius:6, padding:'.55rem', textAlign:'center', marginBottom:'.75rem' }}>No options set</div>
                      : <div style={{ display:'flex', flexDirection:'column', gap:'.35rem', marginBottom:'.75rem' }}>
                          {items.map(item => (
                            <div key={item.plan_id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background: CAT[item.category]?.bg, borderRadius:6, padding:'.38rem .7rem' }}>
                              <span style={{ fontSize:'.84rem', fontWeight:500, color: CAT[item.category]?.c }}>{item.item_name} <span style={{ opacity:.7, fontSize:'.7rem' }}>({item.category})</span></span>
                              {!viewWeek && (
                                <button onClick={() => removeFromPlan(item.plan_id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:'.85rem', padding:'0 .1rem' }}>✕</button>
                              )}
                            </div>
                          ))}
                        </div>
                    }
                    {!viewWeek && (
                      <div style={{ borderTop:'1px solid #f3f4f6', paddingTop:'.65rem' }}>
                        <div style={{ fontSize:'.75rem', color:'#6b7280', fontWeight:600, marginBottom:'.35rem' }}>Add from master list:</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'.25rem', maxHeight:170, overflowY:'auto' }}>
                          {all.filter(i => !addedIds.has(i.id)).map(item => (
                            <button key={item.id} onClick={() => addToPlan(selDay, meal, item.id)} style={{ textAlign:'left', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6, padding:'.32rem .65rem', cursor:'pointer', fontSize:'.8rem', color:'#374151', transition:'background .1s' }}
                              onMouseEnter={e => e.target.style.background='#eff6ff'} onMouseLeave={e => e.target.style.background='#f9fafb'}>
                              + {item.item_name} <span style={{ fontSize:'.7rem', color: CAT[item.category]?.c }}>({item.category})</span>
                            </button>
                          ))}
                          {all.filter(i => !addedIds.has(i.id)).length === 0 && <div style={{ fontSize:'.75rem', color:'#9ca3af' }}>All items added.</div>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Master Item List Tab */}
        {tab === 'master' && (
          <>
            <div className="card" style={{ marginBottom:'1.5rem' }}>
              <div className="card-title">Add New Menu Item</div>
              <form onSubmit={addMaster} style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
                <div className="form-group" style={{ marginBottom:0, minWidth:130 }}>
                  <label className="form-label">Meal Type</label>
                  <select className="form-control" value={masterForm.meal_type} onChange={e => setMasterForm(f => ({...f, meal_type:e.target.value}))}>
                    {MEALS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom:0, flex:1, minWidth:180 }}>
                  <label className="form-label">Item Name</label>
                  <input className="form-control" placeholder="e.g. Paneer Butter Masala" value={masterForm.item_name} onChange={e => setMasterForm(f => ({...f, item_name:e.target.value}))} />
                </div>
                <div className="form-group" style={{ marginBottom:0, minWidth:130 }}>
                  <label className="form-label">Category</label>
                  <select className="form-control" value={masterForm.category} onChange={e => setMasterForm(f => ({...f, category:e.target.value}))}>
                    {['Veg','Non-Veg','Special'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingMaster} style={{ marginBottom:'1rem' }}>{savingMaster ? 'Adding…' : '+ Add'}</button>
              </form>
            </div>
            {MEALS.map(meal => (
              <div className="card" key={meal} style={{ marginBottom:'1rem' }}>
                <div className="card-title">{meal} <span style={{ fontWeight:400, fontSize:'.8rem', color:'#6b7280' }}>({master[meal]?.length || 0} items)</span></div>
                {!master[meal]?.length ? <div style={{ color:'#9ca3af', fontSize:'.83rem' }}>No items yet.</div> : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem' }}>
                    {master[meal].map(item => (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'.4rem', background: CAT[item.category]?.bg, borderRadius:8, padding:'.3rem .7rem' }}>
                        <span style={{ fontSize:'.83rem', fontWeight:500, color: CAT[item.category]?.c }}>{item.item_name}</span>
                        <button onClick={() => delMaster(item.id, item.item_name)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:'.8rem', padding:0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}