const { pool } = require('../config/db');
const XLSX     = require('xlsx');

// ─── POST /api/archive/run ────────────────────────────────────────────────
// Body: { month: 6, year: 2026 }   (month is 1-12)
// Archives registrations and feedback for that specific month+year.
// Uses a transaction — if anything fails, all changes roll back.
const runArchive = async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'month and year are required.' });
  }
  if (month < 1 || month > 12) {
    return res.status(400).json({ success: false, message: 'month must be 1–12.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Archive registrations for this month+year
    const [regResult] = await conn.query(
      `INSERT IGNORE INTO archived_registrations (
         id, user_id, mess_type, registration_date, expiry_date, status,
         payment_proof, approval_status, approved_by, approved_at, created_at,
         user_name, user_email, user_phone, user_trainee_id, user_trainee_type,
         user_hostel_block, user_member_type, user_role,
         archive_year, archived_by
       )
       SELECT
         r.id, r.user_id, r.mess_type, r.registration_date, r.expiry_date, r.status,
         r.payment_proof, r.approval_status, r.approved_by, r.approved_at, r.created_at,
         u.name, u.email, u.phone, u.trainee_id, u.trainee_type,
         u.hostel_block, u.member_type, u.role,
         ?, ?
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE YEAR(r.created_at) = ? AND MONTH(r.created_at) = ?`,
      [year, req.user.id, year, month]
    );

    // Archive feedback for this month+year
    const [fbResult] = await conn.query(
      `INSERT IGNORE INTO archived_feedback (
         id, user_id, rating, category, comments, created_at,
         user_name, user_email,
         archive_year, archived_by
       )
       SELECT
         f.id, f.user_id, f.rating, f.category, f.comments, f.created_at,
         u.name, u.email,
         ?, ?
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE YEAR(f.created_at) = ? AND MONTH(f.created_at) = ?`,
      [year, req.user.id, year, month]
    );

    const regsArchived = regResult.affectedRows;
    const fbArchived   = fbResult.affectedRows;

    // Delete from active tables
    await conn.query(
      'DELETE FROM registrations WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?',
      [year, month]
    );
    await conn.query(
      'DELETE FROM feedback WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?',
      [year, month]
    );

    // Log the operation — store month+year as a combined label
    await conn.query(
      `INSERT INTO archive_log (archive_year, archived_by, registrations_archived, feedback_archived)
       VALUES (?, ?, ?, ?)`,
      [year, req.user.id, regsArchived, fbArchived]
    );

    await conn.commit();

    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
    return res.json({
      success: true,
      message: `Archive complete for ${monthName} ${year}. ${regsArchived} registrations and ${fbArchived} feedback records archived.`,
      data: { month, year, regsArchived, fbArchived },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Archive error:', err);
    return res.status(500).json({ success: false, message: 'Archive failed. All changes rolled back.' });
  } finally {
    conn.release();
  }
};

// ─── GET /api/archive/years ───────────────────────────────────────────────
const getArchiveYears = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         al.id AS log_id,
         al.archive_year,
         al.registrations_archived,
         al.feedback_archived,
         al.archived_at,
         u.name AS archived_by_name
       FROM archive_log al
       JOIN users u ON al.archived_by = u.id
       ORDER BY al.archive_year DESC, al.archived_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/archive/registrations?year=2024 ─────────────────────────────
const getArchivedRegistrations = async (req, res) => {
  const year = req.query.year;
  if (!year) return res.status(400).json({ success: false, message: 'year required.' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM archived_registrations WHERE archive_year = ? ORDER BY registration_date DESC',
      [year]
    );
    return res.json({ success: true, data: rows, year });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/archive/feedback?year=2024 ──────────────────────────────────
const getArchivedFeedback = async (req, res) => {
  const year = req.query.year;
  if (!year) return res.status(400).json({ success: false, message: 'year required.' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM archived_feedback WHERE archive_year = ? ORDER BY created_at DESC',
      [year]
    );
    const [[stats]] = await pool.query(
      `SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS total,
              SUM(rating=5) AS five_star, SUM(rating=4) AS four_star,
              SUM(rating=3) AS three_star, SUM(rating=2) AS two_star, SUM(rating=1) AS one_star
       FROM archived_feedback WHERE archive_year = ?`,
      [year]
    );
    return res.json({ success: true, data: rows, stats, year });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/archive/export?year=2024 ────────────────────────────────────
const exportArchive = async (req, res) => {
  const year = req.query.year;
  if (!year) return res.status(400).json({ success: false, message: 'year required.' });
  try {
    const [regs] = await pool.query(
      'SELECT * FROM archived_registrations WHERE archive_year = ? ORDER BY registration_date',
      [year]
    );
    const [fbs] = await pool.query(
      'SELECT * FROM archived_feedback WHERE archive_year = ? ORDER BY created_at',
      [year]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regs.map(r => ({
      'Name':         r.user_name,
      'Email':        r.user_email,
      'Phone':        r.user_phone || '—',
      'Trainee ID':   r.user_trainee_id || '—',
      'Type':         r.user_trainee_type || r.user_member_type,
      'Block':        r.user_hostel_block || '—',
      'Member Type':  r.user_member_type,
      'Mess Type':    r.mess_type,
      'Reg Date':     r.registration_date,
      'Expiry':       r.expiry_date,
      'Status':       r.status,
      'Approval':     r.approval_status,
    }))), `Registrations ${year}`);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fbs.map(f => ({
      'Name':     f.user_name,
      'Email':    f.user_email,
      'Rating':   f.rating,
      'Category': f.category,
      'Comments': f.comments || '—',
      'Date':     new Date(f.created_at).toLocaleDateString('en-IN'),
    }))), `Feedback ${year}`);
    res.setHeader('Content-Disposition', `attachment; filename=snti_archive_${year}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Export failed.' });
  }
};

// ─── DELETE /api/archive/:year ────────────────────────────────────────────
// Permanently deletes ALL archived records for a given year.
// Requires confirmation from frontend (no undo).
const deleteArchive = async (req, res) => {
  const year = req.params.year;
  if (!year) return res.status(400).json({ success: false, message: 'year required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [r1] = await conn.query('DELETE FROM archived_registrations WHERE archive_year = ?', [year]);
    const [r2] = await conn.query('DELETE FROM archived_feedback WHERE archive_year = ?', [year]);
    const [r3] = await conn.query('DELETE FROM archive_log WHERE archive_year = ?', [year]);

    await conn.commit();
    return res.json({
      success: true,
      message: `Archive for ${year} permanently deleted. ${r1.affectedRows} registrations, ${r2.affectedRows} feedback records, ${r3.affectedRows} log entries removed.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('Delete archive error:', err);
    return res.status(500).json({ success: false, message: 'Delete failed. Changes rolled back.' });
  } finally {
    conn.release();
  }
};

module.exports = {
  runArchive,
  getArchiveYears,
  getArchivedRegistrations,
  getArchivedFeedback,
  exportArchive,
  deleteArchive,
};