import React, { useState } from 'react';
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

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out.');
    navigate('/', { replace: true });
    setDrawerOpen(false);
  };

  const handleLinkClick = () => setDrawerOpen(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          🍽️ SNTI Hostel Mess
          {user?.role === 'external' && (
            <span style={{ fontSize:'.7rem', background:'rgba(255,255,255,.2)', padding:'.15rem .5rem', borderRadius:99, marginLeft:'.4rem' }}>External</span>
          )}
        </div>

        {/* Desktop links — hidden on mobile via CSS */}
        <div className="navbar-links navbar-links-desktop">
          {links.map(({ to, label }) => (
            <Link key={to} to={to} className={`nav-link ${location.pathname === to ? 'active' : ''}`}>{label}</Link>
          ))}
          <span className="nav-user">{user?.name?.split(' ')[0]}</span>
          <button className="nav-link" onClick={handleLogout}>Logout</button>
        </div>

        {/* Hamburger — visible only on mobile via CSS */}
        <button
          className="navbar-hamburger"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="navbar-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="navbar-drawer" onClick={e => e.stopPropagation()}>
            <div className="navbar-drawer-header">
              <span style={{ fontWeight: 800, fontSize: '.95rem' }}>
                🍽️ SNTI Hostel Mess
                {user?.role === 'external' && (
                  <span style={{ fontSize:'.7rem', background:'#dbeafe', color:'#1e40af', padding:'.15rem .5rem', borderRadius:99, marginLeft:'.4rem' }}>External</span>
                )}
              </span>
              <button className="navbar-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            <div className="navbar-drawer-user">
              Signed in as <strong>{user?.name}</strong>
            </div>

            <div className="navbar-drawer-links">
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`navbar-drawer-link ${location.pathname === to ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  {label}
                </Link>
              ))}
            </div>

            <button className="navbar-drawer-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}