import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPassword, verifyOTP, resetPassword } from '../../utils/api';

const OTPInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const digits = value.split('');
  const set = (idx, val) => {
    const next = [...digits];
    next[idx] = val;
    onChange(next.join(''));
    if (val && idx < 5) refs.current[idx+1]?.focus();
  };
  return (
    <div style={{ display:'flex', gap:'.5rem', justifyContent:'center', margin:'1.25rem 0' }}>
      {[0,1,2,3,4,5].map(i => (
        <input key={i} ref={el => refs.current[i]=el} type="text" inputMode="numeric" maxLength={1}
          value={digits[i]||''} onChange={e => set(i, e.target.value.replace(/\D/,''))}
          onKeyDown={e => { if (e.key==='Backspace'&&!digits[i]&&i>0) refs.current[i-1]?.focus(); }}
          onPaste={e => { e.preventDefault(); const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6); onChange(p); refs.current[Math.min(p.length,5)]?.focus(); }}
          style={{ width:44, height:52, textAlign:'center', fontSize:'1.3rem', fontWeight:700, border:`2px solid ${digits[i]?'#1e40af':'#e5e7eb'}`, borderRadius:8, outline:'none', color:'#1e40af' }}
        />
      ))}
    </div>
  );
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(0);
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [devOtp,  setDevOtp]  = useState('');
  const [pass,    setPass]    = useState({ new:'', confirm:'' });
  const [showP,   setShowP]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    setTimer(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer(t => { if(t<=1){clearInterval(timerRef.current);return 0;} return t-1; }), 1000);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  const sendOTP = async () => {
    if (!/^\d{10}$/.test(phone)) { toast.error('Enter a valid 10-digit number.'); return; }
    setLoading(true);
    try {
      const res = await forgotPassword({ phone: `+91${phone}` });
      if (res.data._dev_otp) { setDevOtp(res.data._dev_otp); toast(`Dev OTP: ${res.data._dev_otp}`, { icon:'🔑', duration:10000 }); }
      startTimer(); setStep(1);
      toast.success('OTP sent.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (otp.length<6) { toast.error('Enter 6-digit OTP.'); return; }
    setLoading(true);
    try { await verifyOTP({ phone:`+91${phone}`, otp }); setStep(2); }
    catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  const reset = async () => {
    if (pass.new.length<8) { toast.error('Min 8 chars.'); return; }
    if (pass.new !== pass.confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
    try { await resetPassword({ phone:`+91${phone}`, otp, new_password: pass.new }); toast.success('Password reset! Please login.'); navigate('/login'); }
    catch (err) { toast.error(err.response?.data?.message || 'Reset failed.'); }
    finally { setLoading(false); }
  };

  const steps = ['Phone', 'OTP', 'New Password'];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize:'1.75rem', marginBottom:'.35rem' }}>🔒</div>
          <h1>Reset Password</h1>
          <p>SNTI Hostel Mess</p>
        </div>

        {/* Steps */}
        <div className="steps">
          {steps.map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                <div className={`step-circle ${i<step?'step-done':i===step?'step-active':'step-pending'}`}>{i<step?'✓':i+1}</div>
                <div className="step-label" style={{ color:i===step?'#1e40af':'#9ca3af' }}>{label}</div>
              </div>
              {i<steps.length-1 && <div className={`step-line ${i<step?'done':''}`} style={{ marginBottom:'1.2rem' }} />}
            </React.Fragment>
          ))}
        </div>

        {step===0 && (
          <div>
            <p style={{ fontSize:'.83rem', color:'#6b7280', marginBottom:'1rem', textAlign:'center' }}>Enter your registered phone number</p>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'.85rem', top:'50%', transform:'translateY(-50%)', fontSize:'.85rem', color:'#6b7280', fontWeight:600 }}>+91</span>
                <input className="form-control" style={{ paddingLeft:'3rem' }} placeholder="10-digit mobile" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/,'').slice(0,10))} inputMode="numeric" />
              </div>
            </div>
            <button className="btn btn-primary btn-full" disabled={loading||phone.length!==10} onClick={sendOTP}>
              {loading ? 'Sending…' : 'Send OTP →'}
            </button>
          </div>
        )}

        {step===1 && (
          <div>
            <p style={{ fontSize:'.83rem', color:'#6b7280', textAlign:'center' }}>OTP sent to <strong>+91 {phone}</strong></p>
            {devOtp && <div className="alert alert-warning" style={{ textAlign:'center', fontSize:'.82rem' }}>Dev OTP: <strong style={{ letterSpacing:'.1em' }}>{devOtp}</strong></div>}
            <OTPInput value={otp} onChange={setOtp} />
            <button className="btn btn-primary btn-full" disabled={loading||otp.length<6} onClick={verify}>{loading?'Verifying…':'Verify OTP →'}</button>
            <div style={{ textAlign:'center', marginTop:'.9rem', fontSize:'.8rem', color:'#6b7280' }}>
              {timer>0 ? <span>Resend in <strong>{timer}s</strong></span> : <button style={{ background:'none', border:'none', color:'#1e40af', fontWeight:600, cursor:'pointer', fontSize:'.8rem' }} onClick={() => { setOtp(''); sendOTP(); }}>Resend OTP</button>}
            </div>
            <div style={{ textAlign:'center', marginTop:'.5rem' }}>
              <button onClick={() => { setStep(0); setOtp(''); }} style={{ background:'none', border:'none', color:'#9ca3af', fontSize:'.78rem', cursor:'pointer' }}>← Change number</button>
            </div>
          </div>
        )}

        {step===2 && (
          <div>
            <p style={{ fontSize:'.83rem', color:'#6b7280', textAlign:'center', marginBottom:'1rem' }}>Choose a strong new password</p>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position:'relative' }}>
                <input type={showP?'text':'password'} className="form-control" placeholder="Min 8 chars" style={{ paddingRight:'2.8rem' }} value={pass.new} onChange={e => setPass(p => ({...p, new:e.target.value}))} />
                <button type="button" onClick={() => setShowP(s => !s)} style={{ position:'absolute', right:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6b7280', padding:0 }}>{showP?'🙈':'👁️'}</button>
              </div>
              {pass.new && (
                <div style={{ fontSize:'.75rem', marginTop:'.3rem', display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
                  {[[pass.new.length>=8,'8+ chars'],[/[A-Z]/.test(pass.new),'Uppercase'],[/[0-9]/.test(pass.new),'Number']].map(([ok,l]) => (
                    <span key={l} style={{ color:ok?'#15803d':'#dc2626' }}>{ok?'✓':'✗'} {l}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-control" placeholder="Repeat password" value={pass.confirm} onChange={e => setPass(p => ({...p, confirm:e.target.value}))} />
            </div>
            <button className="btn btn-primary btn-full" disabled={loading} onClick={reset}>{loading?'Resetting…':'Reset Password'}</button>
          </div>
        )}

        <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'.8rem', color:'#6b7280' }}>
          <Link to="/login" style={{ color:'#1e40af', fontWeight:600 }}>← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
