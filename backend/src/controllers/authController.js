const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');
const { validationResult } = require('express-validator');

const makeToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  phone: u.phone, trainee_id: u.trainee_id, trainee_type: u.trainee_type,
  hostel_block: u.hostel_block, member_type: u.member_type,
});

// POST /api/auth/login  — portal: 'student' | 'admin'
const login = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, message: errs.array()[0].msg });

  const { email, password, portal } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND is_active=1', [email]);
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];

    if (portal === 'admin' && user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'This account does not have admin access.' });

    if (portal === 'student' && user.role === 'admin')
      return res.status(403).json({ success: false, message: 'Please use the admin portal to sign in.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    return res.json({ success: true, token: makeToken(user.id, user.role), user: safeUser(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, message: errs.array()[0].msg });

  const { name, email, password, phone, trainee_id, trainee_type, hostel_block, member_type } = req.body;
  const isExternal = member_type === 'Mess Only';
  const role       = isExternal ? 'external' : 'student';

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ success: false, message: 'Email already registered.' });

    if (!isExternal && trainee_id) {
      const [tid] = await pool.query('SELECT id FROM users WHERE trainee_id=?', [trainee_id]);
      if (tid.length) return res.status(409).json({ success: false, message: 'Trainee ID already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name,email,password,phone,trainee_id,trainee_type,hostel_block,member_type,role)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, email, hash, phone||null, trainee_id||null, trainee_type||null, hostel_block||null, member_type||'Hostel', role]
    );

    const user = { id: result.insertId, name, email, role, phone, trainee_id, trainee_type, hostel_block, member_type: member_type||'Hostel' };
    return res.status(201).json({ success: true, token: makeToken(result.insertId, role), user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => res.json({ success: true, user: safeUser(req.user) });

// POST /api/auth/forgot-password  body: { phone }
const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone is required.' });
  try {
    const [rows] = await pool.query("SELECT id,name FROM users WHERE phone=? AND is_active=1", [phone]);
    if (!rows.length) return res.json({ success: true, message: 'If registered, OTP has been sent.' });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query('UPDATE users SET otp_code=?,otp_expires=? WHERE id=?', [otp, expires, rows[0].id]);

    console.log(`[OTP] ${phone} → ${otp} (expires ${expires.toISOString()})`);
    return res.json({
      success: true, message: 'OTP sent.',
      _dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/auth/verify-otp  body: { phone, otp }
const verifyOTP = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const [rows] = await pool.query("SELECT id,otp_code,otp_expires FROM users WHERE phone=? AND is_active=1", [phone]);
    if (!rows.length || rows[0].otp_code !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    if (new Date() > new Date(rows[0].otp_expires))
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    return res.json({ success: true, message: 'OTP verified.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/auth/reset-password  body: { phone, otp, new_password }
const resetPassword = async (req, res) => {
  const { phone, otp, new_password } = req.body;
  if (!phone || !otp || !new_password || new_password.length < 8)
    return res.status(400).json({ success: false, message: 'All fields required. Password min 8 chars.' });
  try {
    const [rows] = await pool.query("SELECT id,otp_code,otp_expires FROM users WHERE phone=? AND is_active=1", [phone]);
    if (!rows.length || rows[0].otp_code !== otp || new Date() > new Date(rows[0].otp_expires))
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password=?,otp_code=NULL,otp_expires=NULL WHERE id=?', [hash, rows[0].id]);
    return res.json({ success: true, message: 'Password reset. Please login.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { login, register, getMe, forgotPassword, verifyOTP, resetPassword };
