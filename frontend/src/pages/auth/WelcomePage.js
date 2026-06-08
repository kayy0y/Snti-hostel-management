import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">

      {/* Background circles */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.04)',
          top: -100,
          right: -100,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.04)',
          bottom: -60,
          left: -60,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="welcome-logo">🍽️</div>

        <h1 className="welcome-title">SNTI Hostel</h1>

        <p className="welcome-subtitle">
          Mess Registration & Smart Menu System
        </p>

        {/* Student Login */}
        <button
          className="welcome-next"
          onClick={() => navigate('/login')}
        >
          Student Login →
        </button>

        {/* Register */}
        <button
          className="welcome-next"
          style={{
            marginTop: '12px',
            background: '#ffffff',
            color: '#15803d'
          }}
          onClick={() => navigate('/register')}
        >
          New Student Registration
        </button>

        {/* Staff Login */}
        <div style={{ marginTop: '30px' }}>
          <p
            style={{
              fontSize: '.9rem',
              opacity: .8,
              marginBottom: '10px'
            }}
          >
            Staff / Warden Access
          </p>

          <button
            className="welcome-next"
            style={{
              background: '#1e293b'
            }}
            onClick={() => navigate('/admin/login')}
          >
            Staff Login
          </button>
        </div>

      </div>
    </div>
  );
}
