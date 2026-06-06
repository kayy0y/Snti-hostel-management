const { pool } = require('../config/db');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');

const calcExpiry = (trainee_type, member_type, from) => {
  const d = new Date(from);
  if (member_type === 'Mess Only')             d.setDate(d.getDate() + 30);
  else if (trainee_type === 'Vocational Trainee') d.setDate(d.getDate() + 90);
  else if (trainee_type === 'Pre Trainee')     d.setFullYear(d.getFullYear() + 2);
  else                                          d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const makeRegQR = async (reg, user) => {
  const payload = JSON.stringify({
    type: 'SNTI_REG', reg_id: reg.id,
    name: user.name, mess: reg.mess_type, expiry: reg.expiry_date,
  });
  return QRCode.toDataURL(payload, { width: 260, margin: 2, color: { dark: '#1e40af', light: '#fff' } });
};

// POST /api/registrations
const createRegistration = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, message: errs.array()[0].msg });

  const { mess_type, payment_proof } = req.body;
  const user_id = req.user.id;

  try {
    const [existing] = await pool.query(
      "SELECT id FROM registrations WHERE user_id=? AND status='active'", [user_id]
    );
    if (existing.length)
      return res.status(409).json({ success: false, message: 'You already have an active registration.' });

    const today       = new Date().toISOString().split('T')[0];
    const expiry_date = calcExpiry(req.user.trainee_type, req.user.member_type, today);
    // All registrations require admin approval regardless of role
    const approval = 'pending';

    const [r] = await pool.query(
      `INSERT INTO registrations (user_id,mess_type,registration_date,expiry_date,payment_proof,approval_status)
       VALUES (?,?,?,?,?,?)`,
      [user_id, mess_type, today, expiry_date, payment_proof||null, approval]
    );

    const reg = { id: r.insertId, mess_type, registration_date: today, expiry_date, approval_status: approval };
    const qr  = await makeRegQR(reg, req.user);

    return res.status(201).json({
      success: true,
      message: approval === 'pending' ? 'Submitted. Awaiting admin approval.' : 'Registration successful.',
      data: { ...reg, qr_code: qr },
    });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/registrations/my
const getMyRegistration = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM registrations WHERE user_id=? AND status='active'", [req.user.id]
    );
    if (!rows.length) return res.json({ success: true, data: null });
    const qr = await makeRegQR(rows[0], req.user);
    return res.json({ success: true, data: { ...rows[0], qr_code: qr } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/registrations  (admin)
const getAllRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,u.name,u.email,u.trainee_id,u.trainee_type,u.hostel_block,u.member_type,u.role AS user_role
       FROM registrations r JOIN users u ON r.user_id=u.id ORDER BY r.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// PUT /api/registrations/:id/approve  (admin)
const approveRegistration = async (req, res) => {
  const { action } = req.body;
  if (!['approve','reject'].includes(action))
    return res.status(400).json({ success: false, message: 'Action must be approve or reject.' });
  try {
    await pool.query(
      'UPDATE registrations SET approval_status=?,approved_by=?,approved_at=NOW() WHERE id=?',
      [action === 'approve' ? 'approved' : 'rejected', req.user.id, req.params.id]
    );
    return res.json({ success: true, message: `Registration ${action}d.` });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { createRegistration, getMyRegistration, getAllRegistrations, approveRegistration };