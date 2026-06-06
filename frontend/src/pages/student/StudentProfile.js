import React from 'react';
import Navbar from '../../components/shared/Navbar';
import { useAuth } from '../../context/AuthContext';

export default function StudentProfile() {
  const { user } = useAuth();
  const rows = [
    ['Full Name',    user?.name],
    ['Email',        user?.email],
    ['Phone',        user?.phone ? `+91 ${user.phone}` : '—'],
    ['Member Type',  user?.member_type],
    ['Trainee ID',   user?.trainee_id   || '—'],
    ['Trainee Type', user?.trainee_type || '—'],
    ['Hostel Block', user?.hostel_block || '—'],
    ['Account Role', user?.role],
  ];

  return (
    <div className="page"><Navbar />
      <div className="main" style={{ maxWidth:520 }}>
        <div className="section-header"><h2 className="section-title">My Profile</h2></div>
        <div className="card">
          <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', margin:'0 auto' }}>👤</div>
            <h3 style={{ marginTop:'.75rem', fontWeight:800 }}>{user?.name}</h3>
            <p style={{ color:'#6b7280', fontSize:'.83rem' }}>{user?.email}</p>
            {user?.role === 'external' && <span className="badge badge-warning" style={{ marginTop:'.4rem' }}>External Member</span>}
          </div>
          <table style={{ width:'100%' }}>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom:'1px solid #f3f4f6' }}>
                  <td style={{ padding:'.6rem .5rem', fontWeight:600, color:'#6b7280', width:'40%', fontSize:'.84rem' }}>{k}</td>
                  <td style={{ padding:'.6rem .5rem', fontSize:'.84rem' }}>{v || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
