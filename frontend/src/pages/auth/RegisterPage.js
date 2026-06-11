import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerUser, getPublicUPIQR } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const EyeBtn = ({ show, toggle }) => (
  <button type="button" onClick={toggle} style={{ position:'absolute', right:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6b7280', padding:0 }}>
    {show ? '🙈' : '👁️'}
  </button>
);

// Step 0 — choose member type
const TypeSelection = ({ onSelect }) => (
  <div>
    <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
      <h2 style={{ fontWeight:800, fontSize:'1.1rem', color:'#1e40af' }}>Choose Registration Type</h2>
      <p style={{ fontSize:'.83rem', color:'#6b7280', marginTop:'.25rem' }}>Select the type that applies to you</p>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
      {[
        { type:'Hostel', title:'Hostel Student', desc:'Residing in SNTI hostel premises. Full mess access including dinner.', color:'#1e40af', bg:'#eff6ff' },
        { type:'Mess Only', title:'External Member', desc:'Not residing in hostel. Breakfast and Lunch access only. Monthly fee applies.', color:'#15803d', bg:'#f0fdf4' },
      ].map(({ type, icon, title, desc, color, bg }) => (
        <button key={type} onClick={() => onSelect(type)} style={{
          border:`2px solid ${color}20`, borderRadius:12, padding:'1.25rem 1rem',
          background:bg, cursor:'pointer', textAlign:'center', transition:'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}20`; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>{icon}</div>
          <div style={{ fontWeight:700, fontSize:'.92rem', color, marginBottom:'.35rem' }}>{title}</div>
          <div style={{ fontSize:'.75rem', color:'#6b7280', lineHeight:1.5 }}>{desc}</div>
        </button>
      ))}
    </div>
    <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'.83rem', color:'#6b7280' }}>
      Already registered? <Link to="/login" style={{ color:'#1e40af', fontWeight:700 }}>Sign in</Link>
    </p>
  </div>
);

// Step 1 — payment QR (external only)
const PaymentStep = ({ upiData, onNext, onBack }) => {
  const [proof,    setProof]    = useState(null);
  const [uploading,setUploading]= useState(false);

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('File must be under 3MB.'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setProof(reader.result); setUploading(false); };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'.83rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.3rem' }}>
        ← Back
      </button>
      <h3 style={{ fontWeight:800, color:'#1e40af', marginBottom:'.25rem' }}>Step 1 — Make Payment</h3>
      <p style={{ fontSize:'.82rem', color:'#6b7280', marginBottom:'1.25rem' }}>Scan the QR and pay the monthly mess fee, then upload your payment screenshot.</p>

      <div style={{ textAlign:'center', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'1.25rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'.8rem', color:'#15803d', fontWeight:700, marginBottom:'.5rem' }}>
          Monthly Mess Fee: ₹{upiData?.amount || '1500'}
        </div>
        {upiData?.upi_id && <div style={{ fontSize:'.75rem', color:'#6b7280', marginBottom:'.75rem' }}>UPI ID: {upiData.upi_id}</div>}
        {upiData?.qr_image
          ? <img src={upiData.qr_image} alt="Payment QR" style={{ width:180, height:180, borderRadius:10, border:'2px solid #86efac', margin:'0 auto', display:'block' }} />
          : <div style={{ width:180, height:180, background:'#e5e7eb', borderRadius:10, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:'.8rem' }}>QR not configured</div>
        }
        <div style={{ fontSize:'.72rem', color:'#9ca3af', marginTop:'.5rem' }}>Scan with GPay, PhonePe, Paytm or any UPI app</div>
      </div>

      <div className="form-group">
        <label className="form-label">Upload Payment Screenshot *</label>
        <input type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} id="proof-upload" />
        <label htmlFor="proof-upload" className="btn btn-outline btn-full" style={{ cursor:'pointer', justifyContent:'center' }}>
          {uploading ? 'Processing…' : proof ? 'Change Screenshot' : 'Upload Screenshot'}
        </label>
        {proof && (
          <div style={{ marginTop:'.75rem', textAlign:'center' }}>
            <img src={proof} alt="proof" style={{ maxWidth:220, borderRadius:8, border:'1px solid #e5e7eb' }} />
            <div style={{ fontSize:'.75rem', color:'#15803d', fontWeight:600, marginTop:'.3rem' }}>Screenshot uploaded</div>
          </div>
        )}
      </div>

      <button className="btn btn-primary btn-full" disabled={!proof} onClick={() => onNext(proof)}>
        Next — Fill Your Details →
      </button>
    </div>
  );
};

// Step 2 — fill registration form
const FormStep = ({ memberType, paymentProof, onBack, onSubmit, loading }) => {
  const isExternal = memberType === 'Mess Only';
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirmPassword:'', trainee_id:'', trainee_type:'', hostel_block:'' });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())             e.name     = 'Required.';
    if (!form.email)                   e.email    = 'Required.';
    if (!/^\d{10}$/.test(form.phone))  e.phone    = 'Must be 10 digits.';
    if (form.password.length < 8)      e.password = 'Min 8 characters.';
    if (!/[A-Z]/.test(form.password))  e.password = 'Must contain uppercase.';
    if (!/[0-9]/.test(form.password))  e.password = 'Must contain a number.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!isExternal) {
      if (!form.trainee_id)           e.trainee_id   = 'Required.';
      if (!form.trainee_type)         e.trainee_type = 'Required.';
      if (!form.hostel_block.trim())  e.hostel_block = 'Required.';
    }
    return e;
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const { confirmPassword, ...payload } = form;
    onSubmit({ ...payload, member_type: memberType, payment_proof: paymentProof || null });
  };

  const f = field => ({ value: form[field], onChange: e => { setForm({ ...form, [field]: e.target.value }); setErrors(p => ({ ...p, [field]: undefined })); } });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <button type="button" onClick={onBack} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'.83rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.3rem' }}>
        ← Back
      </button>
      <h3 style={{ fontWeight:800, color:'#1e40af', marginBottom:'.25rem' }}>
        {isExternal ? 'Step 2 — Your Details' : 'Create Your Account'}
      </h3>
      <p style={{ fontSize:'.82rem', color:'#6b7280', marginBottom:'1.25rem' }}>
        {isExternal ? 'Fill in your details. Admin will review your registration.' : 'Fill in your hostel student details.'}
      </p>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-control" placeholder="Your full name" {...f('name')} />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input type="email" className="form-control" placeholder="your@email.com" {...f('email')} />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Phone Number *</label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:'.85rem', top:'50%', transform:'translateY(-50%)', fontSize:'.85rem', color:'#6b7280', fontWeight:600 }}>+91</span>
          <input className="form-control" style={{ paddingLeft:'3rem' }} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" {...f('phone')} />
        </div>
        {errors.phone && <span className="form-error">{errors.phone}</span>}
      </div>

      {!isExternal && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Trainee ID *</label>
              <input className="form-control" placeholder="e.g. VT2024001" {...f('trainee_id')} />
              {errors.trainee_id && <span className="form-error">{errors.trainee_id}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Trainee Type *</label>
              <select className="form-control" {...f('trainee_type')}>
                <option value="">-- Select --</option>
                <option value="Vocational Trainee">Vocational Trainee (3 months)</option>
                <option value="Pre Trainee">Pre Trainee (2 years)</option>
              </select>
              {errors.trainee_type && <span className="form-error">{errors.trainee_type}</span>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Hostel Block *</label>
            <input className="form-control" placeholder="e.g. Block A, Room 204" {...f('hostel_block')} />
            {errors.hostel_block && <span className="form-error">{errors.hostel_block}</span>}
          </div>
        </>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position:'relative' }}>
            <input type={showPass ? 'text' : 'password'} className="form-control" placeholder="Min 8 chars" style={{ paddingRight:'2.8rem' }} {...f('password')} />
            <EyeBtn show={showPass} toggle={() => setShowPass(s => !s)} />
          </div>
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password *</label>
          <div style={{ position:'relative' }}>
            <input type={showConfirm ? 'text' : 'password'} className="form-control" placeholder="Repeat password" style={{ paddingRight:'2.8rem' }} {...f('confirmPassword')} />
            <EyeBtn show={showConfirm} toggle={() => setShowConfirm(s => !s)} />
          </div>
          {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
};

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [step,        setStep]        = useState(0); // 0=type, 1=payment(ext), 2=form
  const [memberType,  setMemberType]  = useState('');
  const [paymentProof,setPaymentProof]= useState(null);
  const [upiData,     setUpiData]     = useState(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    getPublicUPIQR().then(r => setUpiData(r.data.data)).catch(() => {});
  }, []);

  const handleTypeSelect = type => {
    setMemberType(type);
    setStep(type === 'Mess Only' ? 1 : 2);
  };

  const handleSubmit = async payload => {
    setLoading(true);
    try {
      const res = await registerUser(payload);
      login(res.data.token, res.data.user);
      toast.success(payload.member_type === 'Mess Only'
        ? 'Account created! Waiting for admin approval.'
        : 'Account created! Welcome to SNTI Mess.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 0 ? 520 : 500 }}>
        <div className="auth-logo" style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:'1.75rem', marginBottom:'.35rem' }}>🍽️</div>
          <h1>SNTI Hostel Mess</h1>
        </div>

        {step === 0 && <TypeSelection onSelect={handleTypeSelect} />}
        {step === 1 && <PaymentStep upiData={upiData} onBack={() => setStep(0)} onNext={proof => { setPaymentProof(proof); setStep(2); }} />}
        {step === 2 && <FormStep memberType={memberType} paymentProof={paymentProof} onBack={() => setStep(memberType === 'Mess Only' ? 1 : 0)} onSubmit={handleSubmit} loading={loading} />}
      </div>
    </div>
  );
}