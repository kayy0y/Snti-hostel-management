import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { getWeeklyPlan, getMyMenuSelection, selectMenu } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CAT  = { Veg:{ bg:'#dcfce7', color:'#15803d' }, 'Non-Veg':{ bg:'#fee2e2', color:'#dc2626' }, Special:{ bg:'#fef9c3', color:'#a16207' } };

const fmt = ws => {
  if (!ws) return '';
  const s = new Date(ws), e = new Date(ws); e.setDate(e.getDate()+6);
  const f = d => d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  return `${f(s)} – ${f(e)}, ${e.getFullYear()}`;
};

const getMonday = () => { const n=new Date(),d=n.getDay(),m=new Date(n); m.setDate(n.getDate()+(d===0?-6:1-d)); return m.toISOString().split('T')[0]; };

export default function MenuSelection() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isExternal = user?.role === 'external';
  const MEALS      = isExternal ? ['Breakfast','Lunch'] : ['Breakfast','Lunch','Dinner'];
  const TOTAL      = DAYS.length * MEALS.length;

  const [plan,       setPlan]       = useState({});
  const [selections, setSelections] = useState({});
  const [weekStart,  setWeekStart]  = useState(getMonday());
  const [isPlanSet,  setIsPlanSet]  = useState(false);
  const [hasWeek,    setHasWeek]    = useState(false);
  const [isDefault,  setIsDefault]  = useState(false);
  const [activeDay,  setActiveDay]  = useState('Monday');
  const [fetching,   setFetching]   = useState(true);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const [planRes, selRes] = await Promise.all([getWeeklyPlan(), getMyMenuSelection()]);
        setPlan(planRes.data.data);
        setIsPlanSet(planRes.data.is_published);
        setWeekStart(planRes.data.week_start || getMonday());
        setHasWeek(selRes.data.has_current_week);
        setIsDefault(selRes.data.is_last_week_default);

        // Build selection map from saved data
        const map = {};
        DAYS.forEach(d => { map[d] = { Breakfast:'', Lunch:'', Dinner:'' }; });
        (selRes.data.data || []).forEach(row => {
          MEALS.forEach(meal => {
            const saved = row[meal.toLowerCase()];
            if (!saved) return;
            const match = planRes.data.data?.[row.day_name]?.[meal]?.find(i => i.item_name === saved);
            if (match) map[row.day_name][meal] = match.menu_id;
          });
        });
        setSelections(map);
      } catch { toast.error('Failed to load menu.'); }
      finally { setFetching(false); }
    })();
  }, []);

  const pick = (day, meal, id) => setSelections(p => ({ ...p, [day]: { ...p[day], [meal]: id } }));

  const filled = DAYS.reduce((acc, d) => acc + MEALS.filter(m => selections[d]?.[m]).length, 0);
  const dayDone = day => MEALS.every(m => selections[day]?.[m]);

  const handleSave = async () => {
    const incomplete = DAYS.filter(d => MEALS.some(m => !selections[d]?.[m]));
    if (incomplete.length && !window.confirm(`${incomplete.join(', ')} not fully filled. Save anyway?`)) return;
    setSaving(true);
    try {
      const week = DAYS.map(day => ({
        day,
        breakfast_menu_id: selections[day]?.Breakfast || null,
        lunch_menu_id:     selections[day]?.Lunch     || null,
        dinner_menu_id:    isExternal ? null : (selections[day]?.Dinner || null),
      }));
      await selectMenu({ week });
      toast.success('Weekly menu saved!');
      navigate('/menu/my');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  if (fetching) return <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <Navbar />
      <div className="main">
        <div className="section-header">
          <div>
            <h2 className="section-title">Select Weekly Menu</h2>
            <p style={{ fontSize:'.82rem', color:'#6b7280', marginTop:'.2rem' }}>Week: <strong>{fmt(weekStart)}</strong></p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !isPlanSet}>
            {saving ? 'Saving…' : `Save Menu (${filled}/${TOTAL})`}
          </button>
        </div>

        {isExternal && <div className="alert alert-info" style={{ marginBottom:'1rem' }}>External membership: Breakfast and Lunch only. Dinner is not included.</div>}
        {!isPlanSet && <div className="alert alert-warning">Admin hasn't set this week's menu yet. You can still browse and check back later.</div>}
        {isPlanSet && isDefault && <div className="alert alert-warning">Showing last week's selections. Update and save for this week.</div>}
        {isPlanSet && hasWeek && <div className="alert alert-success">This week's menu is saved. You can edit and re-save anytime.</div>}

        {isPlanSet && (
          <>
            {/* Progress */}
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'#6b7280', marginBottom:'.3rem' }}>
                <span>{filled} of {TOTAL} meals selected</span>
                <span>{Math.round((filled/TOTAL)*100)}%</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${filled===TOTAL?'complete':''}`} style={{ width:`${(filled/TOTAL)*100}%` }} />
              </div>
            </div>

            {/* Day tabs */}
            <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'1rem' }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => setActiveDay(d)} style={{
                  padding:'.35rem .9rem', borderRadius:8, fontSize:'.82rem', cursor:'pointer', border:'none',
                  background: activeDay===d ? '#1e40af' : dayDone(d) ? '#dcfce7' : '#f3f4f6',
                  color:      activeDay===d ? '#fff'    : dayDone(d) ? '#15803d' : '#374151',
                  fontWeight: activeDay===d ? 700 : 500,
                }}>
                  {dayDone(d) ? '✓ ' : ''}{d.slice(0,3)}
                </button>
              ))}
            </div>

            {/* Meal cards for active day */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:'1rem' }}>
              {MEALS.map(meal => {
                const opts = plan[activeDay]?.[meal] || [];
                const selId = selections[activeDay]?.[meal] || '';
                return (
                  <div className="card" key={meal}>
                    <div style={{ fontWeight:700, marginBottom:'.75rem', fontSize:'.95rem' }}>
                      {meal === 'Breakfast' ? '🌅' : meal === 'Lunch' ? '☀️' : '🌙'} {meal}
                      {selId && <span style={{ fontSize:'.72rem', color:'#15803d', marginLeft:'.5rem', fontWeight:600 }}>Selected</span>}
                    </div>
                    {opts.length === 0 ? (
                      <div style={{ fontSize:'.8rem', color:'#9ca3af', background:'#f9fafb', borderRadius:6, padding:'.6rem', textAlign:'center' }}>
                        No options set by admin
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'.4rem' }}>
                        {opts.map(item => {
                          const isSel = selId === item.menu_id;
                          return (
                            <div key={item.menu_id} onClick={() => pick(activeDay, meal, item.menu_id)} style={{
                              padding:'.55rem .85rem', borderRadius:8, cursor:'pointer',
                              border:`2px solid ${isSel ? '#1e40af' : '#e5e7eb'}`,
                              background: isSel ? '#eff6ff' : '#fff',
                              display:'flex', alignItems:'center', justifyContent:'space-between',
                              transition:'all .12s',
                            }}>
                              <span style={{ fontSize:'.87rem', fontWeight: isSel ? 600 : 400, color: isSel ? '#1e40af' : '#111' }}>
                                {item.item_name}
                              </span>
                              <span style={{ fontSize:'.7rem', fontWeight:600, padding:'.1rem .45rem', borderRadius:99, background: CAT[item.category]?.bg, color: CAT[item.category]?.color }}>
                                {item.category}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:'1.5rem', display:'flex', justifyContent:'flex-end', gap:'1rem' }}>
              <button className="btn btn-outline" onClick={() => navigate('/menu/my')}>View Saved</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Weekly Menu'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
