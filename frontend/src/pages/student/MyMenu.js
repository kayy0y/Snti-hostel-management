import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { getMyMenuSelection, getMyRegistration } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const fmt = ws => {
  if (!ws) return '';
  const s = new Date(ws), e = new Date(ws);
  e.setDate(e.getDate() + 6);
  const f = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${f(s)} – ${f(e)}, ${e.getFullYear()}`;
};

// Render a list of items as comma-separated, or dash if empty
const renderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0)
    return <span style={{ color: '#d1d5db' }}>—</span>;

  return items.map(i => i.item_name).join(', ');
};

export default function MyMenu() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isExternal = user?.role === 'external';

  const [data,      setData]      = useState({});  // { Monday: { Breakfast:[], Lunch:[], Dinner:[] }, ... }
  const [reg,       setReg]       = useState(null);
  const [weekStart, setWeekStart] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getMyMenuSelection(), getMyRegistration()])
      .then(([mRes, rRes]) => {
        setData(mRes.data.data || {});
        setWeekStart(mRes.data.week_start);
        setIsDefault(mRes.data.is_last_week_default);
        setReg(rRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page"><Navbar /><div className="loading"><div className="spinner" /></div></div>
  );

  const hasMenu = Object.values(data).some(d =>
    (d?.Breakfast?.length || 0) + (d?.Lunch?.length || 0) + (d?.Dinner?.length || 0) > 0
  );

  const isApproved = reg?.approval_status === 'approved';

  // QR conditions: external user + admin approved + menu saved this week
  const showQR = isExternal && isApproved && hasMenu && !isDefault && reg?.qr_code;

  return (
    <div className="page">
      <Navbar />
      <div className="main">
        <div className="section-header">
          <div>
            <h2 className="section-title">My Weekly Menu</h2>
            {weekStart && (
              <p style={{ fontSize: '.82rem', color: '#6b7280', marginTop: '.2rem' }}>
                Week: <strong>{fmt(weekStart)}</strong>
              </p>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/menu/select')}>
            Edit Menu
          </button>
        </div>

        {isDefault && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            Showing last week's menu.{' '}
            <span style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate('/menu/select')}>
              Select this week's menu →
            </span>
          </div>
        )}

        {!hasMenu ? (
          <div className="card">
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🍽️</div>
              <p>No menu selected yet for this week.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/menu/select')}>
                Select Menu
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: showQR ? '1fr auto' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Menu table */}
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Breakfast 🌅</th>
                    <th>Lunch ☀️</th>
                    {!isExternal && <th>Dinner 🌙</th>}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d, i) => {
                    const day = data[d] || { Breakfast: [], Lunch: [], Dinner: [] };
                    return (
                      <tr key={d} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ fontWeight: 700, fontSize: '.88rem', verticalAlign: 'top' }}>{d}</td>
                        <td style={{ fontSize: '.85rem', verticalAlign: 'top' }}>{renderItems(day.Breakfast)}</td>
                        <td style={{ fontSize: '.85rem', verticalAlign: 'top' }}>{renderItems(day.Lunch)}</td>
                        {!isExternal && <td style={{ fontSize: '.85rem', verticalAlign: 'top' }}>{renderItems(day.Dinner)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* QR code — external + approved + menu saved */}
            {showQR && (
              <div className="card" style={{ textAlign: 'center', flexShrink: 0, minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: '.75rem', color: '#1e40af' }}>
                  Mess Entry QR
                </div>
                <img
                  src={reg.qr_code}
                  alt="Registration QR"
                  style={{ width: 160, height: 160, borderRadius: 8, border: '2px solid #dbeafe' }}
                />
                <div style={{ fontSize: '.72rem', color: '#6b7280', marginTop: '.6rem', lineHeight: 1.4 }}>
                  Show this QR at the mess counter for entry
                </div>
                <div style={{ fontSize: '.7rem', color: '#9ca3af', marginTop: '.3rem' }}>
                  Valid until: {reg.expiry_date}
                </div>
              </div>
            )}

            {/* External + approved but menu not yet saved */}
            {isExternal && isApproved && !hasMenu && (
              <div className="card" style={{ textAlign: 'center', flexShrink: 0, minWidth: 180, padding: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔒</div>
                <div style={{ fontWeight: 600, fontSize: '.85rem', color: '#a16207', marginBottom: '.35rem' }}>QR Not Ready</div>
                <div style={{ fontSize: '.75rem', color: '#6b7280' }}>Save your weekly menu to unlock your entry QR.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}