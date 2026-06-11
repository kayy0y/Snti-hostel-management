const bcrypt = require('bcryptjs');
const XLSX   = require('xlsx');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');

const getAllStudents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id,name,email,phone,trainee_id,trainee_type,hostel_block,member_type,role,is_active,created_at FROM users WHERE role IN ('student','external') ORDER BY created_at DESC"
    );
    return res.json({ success: true, data: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const addStudent = async (req, res) => {
  const { name, email, password, trainee_id, trainee_type, hostel_block, member_type } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, password required.' });
  try {
    const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (ex.length) return res.status(409).json({ success: false, message: 'Email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const role = member_type === 'Mess Only' ? 'external' : 'student';
    const [r]  = await pool.query(
      'INSERT INTO users (name,email,password,trainee_id,trainee_type,hostel_block,member_type,role) VALUES (?,?,?,?,?,?,?,?)',
      [name, email, hash, trainee_id||null, trainee_type||null, hostel_block||null, member_type||'Hostel', role]
    );
    return res.status(201).json({ success: true, data: { id: r.insertId, name, email, role } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteStudent = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email FROM users WHERE id=? AND role IN ('student','external') AND is_active=1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Active student not found.' });

    const user = rows[0];

    await pool.query(
      "UPDATE users SET is_active=0, deactivated_at=NOW(), pending_deletion=1 WHERE id=?",
      [req.params.id]
    );

    const { sendDeactivationEmail } = require('../utils/emailService');
    sendDeactivationEmail(user).catch(() => {});

    return res.json({ success: true, message: `${user.name} deactivated. Account will be permanently deleted after 48 hours.` });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deactivateSelf = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_active=0, deactivated_at=NOW(), pending_deletion=0 WHERE id=?',
      [req.user.id]
    );
    return res.json({ success: true, message: 'Account deactivated. Log in again to reactivate.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteSelf = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email confirmation required.' });
  if (email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(400).json({ success: false, message: 'Email does not match your account.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT IGNORE INTO archived_registrations (
         id, user_id, mess_type, registration_date, expiry_date, status,
         payment_proof, approval_status, approved_by, approved_at, created_at,
         user_name, user_email, user_phone, user_trainee_id, user_trainee_type,
         user_hostel_block, user_member_type, user_role,
         archive_year, archived_by
       )
       SELECT r.id, r.user_id, r.mess_type, r.registration_date, r.expiry_date, r.status,
              r.payment_proof, r.approval_status, r.approved_by, r.approved_at, r.created_at,
              u.name, u.email, u.phone, u.trainee_id, u.trainee_type,
              u.hostel_block, u.member_type, u.role,
              YEAR(NOW()), ?
       FROM registrations r JOIN users u ON r.user_id=u.id
       WHERE r.user_id=?`,
      [req.user.id, req.user.id]
    );

    await conn.query(
      `INSERT IGNORE INTO archived_feedback (
         id, user_id, rating, category, comments, created_at,
         user_name, user_email, archive_year, archived_by
       )
       SELECT f.id, f.user_id, f.rating, f.category, f.comments, f.created_at,
              u.name, u.email, YEAR(NOW()), ?
       FROM feedback f JOIN users u ON f.user_id=u.id
       WHERE f.user_id=?`,
      [req.user.id, req.user.id]
    );

    await conn.query('DELETE FROM users WHERE id=?', [req.user.id]);

    await conn.commit();
    return res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    console.error('deleteSelf error:', e);

    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  } finally {
    conn.release();
  }
};

// ... (rest of your functions remain unchanged, including deleteExpiredUsers, getDashboardStats, getQuickAnalytics, exportReport, exportPDF, createAdmin, getAdminList, getAnalytics, deleteStudentNow, resetBatch)

module.exports = {
  getAllStudents,
  addStudent,
  deleteStudent,
  deactivateSelf,
  deleteSelf,
  deleteStudentNow,
  resetBatch,
  deleteExpiredUsers,
  getDashboardStats,
  getQuickAnalytics,
  exportReport,
  exportPDF,
  createAdmin,
  getAdminList,
  getAnalytics
};
