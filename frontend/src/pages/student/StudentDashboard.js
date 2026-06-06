import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { useAuth } from '../../context/AuthContext';
import { getMyRegistration } from '../../utils/api';

const ALL_CARDS = [
  { icon: '📝', title: 'Mess Registration', desc: 'Register for hostel mess',    path: '/register-mess', requiresApproval: false },
  { icon: '🍽️', title: 'Select Menu',       desc: 'Choose your weekly meals',    path: '/menu/select',   requiresApproval: true  },
  { icon: '📋', title: 'My Menu',           desc: 'View your saved menu',        path: '/menu/my',       requiresApproval: true  },
  { icon: '💬', title: 'Feedback',          desc: 'Rate food and services',      path: '/feedback',      requiresApproval: true  },
  { icon: '👤', title: 'My Profile',        desc: 'View your details',           path: '/profile',       requiresApproval: false },
];

export default function StudentDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const isExternal = user?.role === 'external';

  const [reg,     setReg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRegistration()
      .then(r => setReg(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isApproved = reg?.approval_status === 'approved';
  const isPending  = reg?.approval_status === 'pending';

  const handleCardClick = (card) => {
    if (card.requiresApproval && !isApproved) return; // locked — do nothing
    navigate(card.path);
  };

  return (
    <div className="page">
      <Navbar />
      <div className="main">
        {/* Welcome banner */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', border: 'none', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>Welcome, {user?.name}</h2>
              <p style={{ opacity: .8, fontSize: '.85rem', marginTop: '.25rem' }}>
                {isExternal
                  ? 'External Mess Member · Breakfast & Lunch'
                  : `${user?.trainee_type} · ${user?.hostel_block}`}
              </p>
            </div>

            {/* Registration status pill */}
            {!loading && (
              <>
                {!reg && (
                  <div
                    style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.83rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                    onClick={() => navigate('/register-mess')}
                  >
                    No registration · <strong>Register now →</strong>
                  </div>
                )}
                {isPending && (
                  <div style={{ background: 'rgba(251,191,36,.25)', border: '1px solid rgba(251,191,36,.5)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.83rem' }}>
                    <span style={{ fontWeight: 700 }}>⏳ Pending Approval</span>
                    <div style={{ fontSize: '.75rem', opacity: .85, marginTop: '.2rem' }}>Awaiting admin review</div>
                  </div>
                )}
                {isApproved && (
                  <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '.75rem 1rem', fontSize: '.83rem', backdropFilter: 'blur(4px)' }}>
                    <div>Mess: <strong>{reg.mess_type}</strong></div>
                    <div>Expires: <strong>{reg.expiry_date}</strong></div>
                    <span className="badge badge-success" style={{ marginTop: '.3rem' }}>Approved</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pending approval notice */}
        {isPending && (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            <strong>Registration Pending.</strong> Your mess registration is awaiting admin approval.
            Menu selection, feedback, and other features will be unlocked once approved.
            You can still view your registration status on the Registration page.
          </div>
        )}

        {/* Dashboard cards */}
        <div className="dash-grid">
          {ALL_CARDS.map(card => {
            const locked = card.requiresApproval && !isApproved;
            return (
              <div
                key={card.path}
                className="dash-card"
                onClick={() => handleCardClick(card)}
                style={{
                  opacity:       locked ? 0.5 : 1,
                  cursor:        locked ? 'not-allowed' : 'pointer',
                  position:      'relative',
                  pointerEvents: locked ? 'none' : 'auto',
                }}
              >
                <div className="dash-card-icon">{card.icon}</div>
                <div className="dash-card-title">{card.title}</div>
                <div className="dash-card-desc">
                  {locked ? 'Requires approved registration' : card.desc}
                </div>
                {locked && (
                  <div style={{
                    position: 'absolute', top: '.5rem', right: '.5rem',
                    fontSize: '.7rem', background: '#fef9c3', color: '#a16207',
                    padding: '.1rem .4rem', borderRadius: 99, fontWeight: 700,
                  }}>
                    Locked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}