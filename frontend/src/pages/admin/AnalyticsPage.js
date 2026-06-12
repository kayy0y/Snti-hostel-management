import React, { useEffect, useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { getAnalytics } from '../../utils/api';
import toast from 'react-hot-toast';


const BarChart = ({ data = [], color = '#1e40af' }) => {

  const safeData = Array.isArray(data)
    ? data.filter(
        item =>
          item &&
          item.item &&
          item.count !== undefined &&
          item.count !== null
      )
    : [];


  if (!safeData.length) {
    return (
      <div style={{color:'#9ca3af',fontSize:'.85rem'}}>
        No data available.
      </div>
    );
  }


  const max = Math.max(
    ...safeData.map(x => Number(x.count) || 0),
    1
  );


  return (
    <div style={{
      display:'flex',
      flexDirection:'column',
      gap:'12px'
    }}>


    {
      safeData.map((x,index)=>(

        <div
        key={index}
        style={{
          display:'flex',
          alignItems:'center',
          gap:'10px'
        }}
        >

          <div
          style={{
            width:'120px',
            fontSize:'13px',
            textAlign:'right'
          }}
          >
            {x.item}
          </div>


          <div
          style={{
            flex:1,
            height:'16px',
            background:'#eee',
            borderRadius:'20px'
          }}
          >

            <div
            style={{
              width:`${(Number(x.count)/max)*100}%`,
              height:'100%',
              background:color,
              borderRadius:'20px',
              minWidth:'5px'
            }}
            />

          </div>


          <b>
            {x.count}
          </b>


        </div>


      ))
    }


    </div>
  );
};

export default function AnalyticsPage(){

const [data,setData] = useState(null);
const [loading,setLoading] = useState(true);
useEffect(()=>{
getAnalytics()
.then(res=>{
console.log(
"Analytics:",
res.data
);
setData(
res.data?.data || {}
);
})
.catch(err=>{
console.error(err);
toast.error(
"Failed loading analytics"
);
})
.finally(()=>{
setLoading(false);
});
},[]);
if(loading){
return (
<div className="page">
<Navbar/>
<div className="loading">
Loading analytics...
</div>
</div>
);
}
if(!data){
return (
<div className="page">
<Navbar/>
<div className="loading">
No analytics found.
</div>
</div>
);
}
const coverage = {
total_students:
data.menu_coverage?.total_students || 0,

selected_this_week:
data.menu_coverage?.selected_this_week || 0

};
const percentage =
coverage.total_students
?
Math.round(
(
coverage.selected_this_week /
coverage.total_students
)
*100
)
:
0;
const breakfast =
data.menu_popularity?.breakfast?.top
||
(data.top_breakfast?.item
?
[
{
item:data.top_breakfast.item,
count:Number(data.top_breakfast.count)||0
}
]
:
[]
);

const lunch =
data.menu_popularity?.lunch?.top
||
(data.top_lunch?.item
?
[
{
item:data.top_lunch.item,
count:Number(data.top_lunch.count)||0
}
]
:
[]
);

const dinner =
data.menu_popularity?.dinner?.top
||
(data.top_dinner?.item
?
[
{
item:data.top_dinner.item,
count:Number(data.top_dinner.count)||0
}
]
:
[]
);
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
Total Members
</div>
<div className="stat-value">
{coverage.total_students}
</div>
</div>
<div className="stat-card">
<div className="stat-label">
Pending Approvals
</div>
<div className="stat-value">
{data.pending_approvals || 0}
</div>
</div>
<div className="stat-card">
<div className="stat-label">
Menu Coverage
</div>
<div className="stat-value">
{percentage}%
</div>
</div>
</div>
<div
style={{
display:'grid',
gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',
gap:'20px'
}}
>
<div className="card">
<div className="card-title">
Breakfast Popularity
</div>
<BarChart
data={breakfast}
color="#f59e0b"
/>
</div>
<div className="card">
<div className="card-title">
Lunch Popularity
</div>
<BarChart
data={lunch}
color="#16a34a"
/>
</div>
<div className="card">
<div className="card-title">
Dinner Popularity
</div>
<BarChart
data={dinner}
color="#2563eb"
/>
</div>
</div>
<div className="card"
style={{
marginTop:'20px'
}}
>
<div className="card-title">
Weekly Menu Selection
</div>
<p>
{coverage.selected_this_week}
/
{coverage.total_students}
members selected this week's menu
</p>
<div
className="progress-bar"
style={{
height:'18px'
}}
>
<div
className="progress-fill"
style={{
width:`${percentage}%`
}}
/>
</div>
</div>
</div>
</div>
);
}