import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STUDENT_NAV = [
  { to:'/dashboard',     label:'Home' },
  { to:'/register-mess', label:'Registration' },
  { to:'/menu/select',   label:'Select Menu' },
  { to:'/menu/my',       label:'My Menu' },
  { to:'/feedback',      label:'Feedback' },
  { to:'/profile',       label:'Profile' },
];

const ADMIN_NAV = [
  { to:'/admin/dashboard',      label:'Dashboard' },
  { to:'/admin/students',       label:'Students' },
  { to:'/admin/registrations',  label:'Registrations' },
  { to:'/admin/menus',          label:'Menus' },
  { to:'/admin/feedback',       label:'Feedback' },
  { to:'/admin/analytics',      label:'Analytics' },
  { to:'/admin/archive',        label:'Archive' },
  { to:'/admin/settings',       label:'Settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin  = user?.role === 'admin';
  const links    = isAdmin ? ADMIN_NAV : STUDENT_NAV;

  const handleLogout = () => {
    logout();
    toast.success('Logged out.');
    navigate('/', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🍽️ SNTI Hostel Mess
        {user?.role === 'external' && (
          <span style={{ fontSize:'.7rem', background:'rgba(255,255,255,.2)', padding:'.15rem .5rem', borderRadius:99, marginLeft:'.4rem' }}>External</span>
        )}
      </div>
      <div className="navbar-links">
        {links.map(({ to, label }) => (
          <Link key={to} to={to} className={`nav-link ${location.pathname === to ? 'active' : ''}`}>{label}</Link>
        ))}
        <span className="nav-user">{user?.name?.split(' ')[0]}</span>
        <button className="nav-link" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}