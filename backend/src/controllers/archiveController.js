const { pool } = require('../config/db');
const XLSX     = require('xlsx');

// ─── POST /api/archive/run ────────────────────────────────────────────────
// Admin triggers archive manually.
// Archives ALL registrations and feedback from a given year (default: previous year).
// Keeps user accounts intact.
const runArchive = async (req, res) => {
  // Default to previous year; admin can pass { year: 2024 } in body
  const year = req.body.year || new Date().getFullYear() - 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Step 1: Archive registrations ──────────────────────────────────
    // Copy registrations + user snapshot into archived_registrations
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
       WHERE YEAR(r.created_at) = ?`,
      [year, req.user.id, year]
    );

    // ── Step 2: Archive feedback ────────────────────────────────────────
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
       WHERE YEAR(f.created_at) = ?`,
      [year, req.user.id, year]
    );

    const regsArchived = regResult.affectedRows;
    const fbArchived   = fbResult.affectedRows;

    // ── Step 3: Delete from active tables ──────────────────────────────
    await conn.query(
      'DELETE FROM registrations WHERE YEAR(created_at) = ?', [year]
    );
    await conn.query(
      'DELETE FROM feedback WHERE YEAR(created_at) = ?', [year]
    );

    // ── Step 4: Log the operation ───────────────────────────────────────
    await conn.query(
      `INSERT INTO archive_log (archive_year, archived_by, registrations_archived, feedback_archived)
       VALUES (?, ?, ?, ?)`,
      [year, req.user.id, regsArchived, fbArchived]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: `Archive complete for year ${year}. ${regsArchived} registrations and ${fbArchived} feedback records archived.`,
      data: { year, regsArchived, fbArchived },
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
// Returns list of years that have archived data
const getArchiveYears = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         al.archive_year,
         al.registrations_archived,
         al.feedback_archived,
         al.archived_at,
         u.name AS archived_by_name
       FROM archive_log al
       JOIN users u ON al.archived_by = u.id
       ORDER BY al.archive_year DESC`
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
  if (!year) return res.status(400).json({ success: false, message: 'year query param required.' });

  try {
    const [rows] = await pool.query(
      `SELECT * FROM archived_registrations
       WHERE archive_year = ?
       ORDER BY registration_date DESC`,
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
  if (!year) return res.status(400).json({ success: false, message: 'year query param required.' });

  try {
    const [rows] = await pool.query(
      `SELECT * FROM archived_feedback
       WHERE archive_year = ?
       ORDER BY created_at DESC`,
      [year]
    );

    // Basic analytics for that year
    const [[stats]] = await pool.query(
      `SELECT
         ROUND(AVG(rating), 1) AS avg_rating,
         COUNT(*)              AS total,
         SUM(rating = 5)       AS five_star,
         SUM(rating = 4)       AS four_star,
         SUM(rating = 3)       AS three_star,
         SUM(rating = 2)       AS two_star,
         SUM(rating = 1)       AS one_star
       FROM archived_feedback
       WHERE archive_year = ?`,
      [year]
    );

    return res.json({ success: true, data: rows, stats, year });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET /api/archive/export?year=2024 ────────────────────────────────────
// Exports archived registrations + feedback for a year as Excel
const exportArchive = async (req, res) => {
  const year = req.query.year;
  if (!year) return res.status(400).json({ success: false, message: 'year query param required.' });

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

    // Sheet 1 — Registrations
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regs.map(r => ({
      'Name':             r.user_name,
      'Email':            r.user_email,
      'Phone':            r.user_phone || '—',
      'Trainee ID':       r.user_trainee_id || '—',
      'Trainee Type':     r.user_trainee_type || r.user_member_type,
      'Hostel Block':     r.user_hostel_block || '—',
      'Member Type':      r.user_member_type,
      'Mess Type':        r.mess_type,
      'Reg Date':         r.registration_date,
      'Expiry Date':      r.expiry_date,
      'Status':           r.status,
      'Approval':         r.approval_status,
    }))), `Registrations ${year}`);

    // Sheet 2 — Feedback
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
    console.error('Archive export error:', err);
    return res.status(500).json({ success: false, message: 'Export failed.' });
  }
};

module.exports = {
  runArchive,
  getArchiveYears,
  getArchivedRegistrations,
  getArchivedFeedback,
  exportArchive,
};