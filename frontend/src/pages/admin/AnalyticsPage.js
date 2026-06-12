import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAnalytics } from '../../utils/api';
import toast from 'react-hot-toast';

const BarChart = ({ data }) => {

  if (!data || !data.length) {
    return (
      <div style={{color:'#9ca3af',fontSize:'.8rem'}}>
        No data available.
      </div>
    );
  }
  const max = Math.max(...data.map(x=>x.count || 0));
  return (
    <div style={{
      display:'flex',
      flexDirection:'column',
      gap:'.5rem'
    }}>

    {data.map((d,i)=>(

      <div
      key={i}
      style={{
        display:'flex',
        alignItems:'center',
        gap:'.7rem'
      }}
      >
      <div style={{
        width:120,
        fontSize:'.8rem'
      }}>
        {d.item || d.name || d.day || 'Unknown'}
      </div>
      <div style={{
        flex:1,
        height:15,
        background:'#eee',
        borderRadius:20
      }}>

      <div
      style={{
        height:'100%',
        width:`${max ? (d.count/max)*100 : 0}%`,
        background:'#1e40af',
        borderRadius:20
      }}
      />

      </div>
      <b>
      {d.count}
      </b>
      </div>

    ))}

    </div>
  );
};

export default function AnalyticsPage(){

const [data,setData]=useState(null);
const [loading,setLoading]=useState(true);

useEffect(()=>{
getAnalytics()
.then(res=>{
console.log("Analytics response:",res.data);
setData(
res.data.data || {}
);
})
.catch(err=>{
console.error(err);
toast.error("Failed loading analytics");
})
.finally(()=>setLoading(false));
},[]);
if(loading)
return (
<div className="page">
<Navbar/>
<div className="loading">
Loading...
</div>
</div>
);
if(!data)
return (
<div className="page">
<Navbar/>
<div className="loading">
No analytics found
</div>
</div>
);
const coverage =
data.menu_coverage || 
{
total_students:0,
selected_this_week:0
};
const pct = coverage.total_students
?
Math.round(
(coverage.selected_this_week /
coverage.total_students)*100
)
:0;
return (
<div className="page">
<Navbar/>
<div className="main">
<h2 className="section-title">
Food Analytics
</h2>
<div className="stats-grid">
<div className="stat-card">
<div className="stat-label">
Members
</div>
<div className="stat-value">
{
coverage.total_students
}
</div>
</div>
<div className="stat-card">
<div className="stat-label">
Pending Approvals
</div>
<div className="stat-value">
{
data.pending_approvals || 0
}
</div>
</div>
</div>
<div className="card">
<div className="card-title">
Breakfast Popularity
</div>
<BarChart
data={
data.menu_popularity?.breakfast?.top ||
data.top_breakfast
?
[
data.top_breakfast
]
:
[]
}
/>
</div>
<div className="card">
<div className="card-title">
Lunch Popularity
</div>
<BarChart
data={
data.menu_popularity?.lunch?.top ||
data.top_lunch
?
[
data.top_lunch
]
:
[]
}

/>
</div>
<div className="card">
<div className="card-title">
Dinner Popularity
</div>
<BarChart
data={
data.menu_popularity?.dinner?.top ||
data.top_dinner
?
[
data.top_dinner
]
:
[]
}
/>
</div>
<div className="card">
<div className="card-title">
Menu coverage
</div>
<p>
{
coverage.selected_this_week
}
/
{
coverage.total_students
}
members selected
</p>
<div className="progress-bar">
<div
className="progress-fill"
style={{
width:`${pct}%`
}}
>
</div>
</div>
</div>
</div>
</div>
);
}