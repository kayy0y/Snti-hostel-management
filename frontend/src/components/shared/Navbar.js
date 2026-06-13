import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STUDENT_NAV = [
  { to:'/dashboard', label:'Home' },
  { to:'/register-mess', label:'Registration' },
  { to:'/menu/select', label:'Select Menu' },
  { to:'/menu/my', label:'My Menu' },
  { to:'/feedback', label:'Feedback' },
  { to:'/profile', label:'Profile' },
];

const ADMIN_NAV = [
  { to:'/admin/dashboard', label:'Dashboard' },
  { to:'/admin/students', label:'Students' },
  { to:'/admin/registrations', label:'Registrations' },
  { to:'/admin/menus', label:'Menus' },
  { to:'/admin/feedback', label:'Feedback' },
  { to:'/admin/analytics', label:'Analytics' },
  { to:'/admin/archive', label:'Archive' },
  { to:'/admin/settings', label:'Settings' },
];
export default function Navbar(){
  const {user, logout} = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen,setDrawerOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const links = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const handleLogout = ()=>{
    logout();
    toast.success("Logged out.");
    navigate("/",{replace:true});
    setDrawerOpen(false);
  };

  return (
<>
<nav className="navbar">

<button
className="navbar-hamburger"
onClick={()=>setDrawerOpen(true)}
>
<span></span>
<span></span>
<span></span>
</button>

<div className="navbar-brand">
🍽️ SNTI Hostel Mess
</div>
<div className="navbar-links navbar-links-desktop">
{
links.map(({to,label})=>(

<Link
key={to}
to={to}
className={
location.pathname===to
?
"nav-link active"
:
"nav-link"
}
>
{label}
</Link>
))
}
<span className="nav-user">
{user?.name?.split(" ")[0]}
</span>
<button className="nav-link"
onClick={handleLogout}
>
Logout
</button>
</div></nav>{
drawerOpen && (
<div
className="navbar-drawer-overlay"
onClick={()=>setDrawerOpen(false)}
>
<div
className="navbar-drawer"
onClick={e=>e.stopPropagation()}
>
<div className="navbar-drawer-header">
<b>
🍽️ SNTI Hostel Mess
</b>
<button
className="navbar-drawer-close"
onClick={()=>setDrawerOpen(false)}
>
✕
</button>
</div>
<div className="navbar-drawer-user">
Signed in as
<strong>
{user?.name}
</strong>
</div>
<div className="navbar-drawer-links">
{
links.map(({to,label})=>(
<Link
key={to}
to={to}
onClick={()=>setDrawerOpen(false)}
className={
location.pathname===to
?
"navbar-drawer-link active"
:
"navbar-drawer-link"
}
>
{label}
</Link>
))
}
</div>
<button
className="navbar-drawer-logout"
onClick={handleLogout}
>
Logout
</button></div>
</div>
)
}
</>
);
}