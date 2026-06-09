const { pool } = require('../config/db');
const XLSX = require('xlsx');

/* =========================
   RUN ARCHIVE (month + year)
========================= */
const runArchive = async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: 'month and year are required'
    });
  }

  if (month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      message: 'month must be between 1 and 12'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    /* ARCHIVE REGISTRATIONS */
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

    /* ARCHIVE FEEDBACK */
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
    const fbArchived = fbResult.affectedRows;

    /* DELETE FROM ACTIVE TABLES */
    await conn.query(
      'DELETE FROM registrations WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?',
      [year, month]
    );

    await conn.query(
      'DELETE FROM feedback WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?',
      [year, month]
    );

    /* LOG */
    await conn.query(
      `INSERT INTO archive_log 
        (archive_year, archived_by, registrations_archived, feedback_archived)
       VALUES (?, ?, ?, ?)`,
      [year, req.user.id, regsArchived, fbArchived]
    );

    await conn.commit();

    const monthName = new Date(year, month - 1).toLocaleString('en-IN', {
      month: 'long'
    });

    return res.json({
      success: true,
      message: `Archive completed for ${monthName} ${year}`,
      data: {
        month,
        year,
        registrations: regsArchived,
        feedback: fbArchived
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Archive error:', err);

    return res.status(500).json({
      success: false,
      message: 'Archive failed. Transaction rolled back.'
    });
  } finally {
    conn.release();
  }
};

/* =========================
   GET ARCHIVE YEARS (LOGS)
========================= */
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
       ORDER BY al.archived_at DESC`
    );

    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* =========================
   ARCHIVED REGISTRATIONS
========================= */
const getArchivedRegistrations = async (req, res) => {
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: 'year required'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM archived_registrations 
       WHERE archive_year = ?
       ORDER BY registration_date DESC`,
      [year]
    );

    return res.json({
      success: true,
      year,
      data: rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* =========================
   ARCHIVED FEEDBACK
========================= */
const getArchivedFeedback = async (req, res) => {
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: 'year required'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM archived_feedback 
       WHERE archive_year = ?
       ORDER BY created_at DESC`,
      [year]
    );

    const [[stats]] = await pool.query(
      `SELECT 
        ROUND(AVG(rating),1) AS avg_rating,
        COUNT(*) AS total,
        SUM(rating=5) AS five_star,
        SUM(rating=4) AS four_star,
        SUM(rating=3) AS three_star,
        SUM(rating=2) AS two_star,
        SUM(rating=1) AS one_star
       FROM archived_feedback
       WHERE archive_year = ?`,
      [year]
    );

    return res.json({
      success: true,
      year,
      data: rows,
      stats
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/* =========================
   EXPORT ARCHIVE (EXCEL)
========================= */
const exportArchive = async (req, res) => {
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: 'year required'
    });
  }

  try {
    const [regs] = await pool.query(
      'SELECT * FROM archived_registrations WHERE archive_year = ?',
      [year]
    );

    const [fbs] = await pool.query(
      'SELECT * FROM archived_feedback WHERE archive_year = ?',
      [year]
    );

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(regs),
      `Registrations_${year}`
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(fbs),
      `Feedback_${year}`
    );

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=archive_${year}.xlsx`
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Export failed'
    });
  }
};

/* =========================
   DELETE ARCHIVE
========================= */
const deleteArchive = async (req, res) => {
  const { year } = req.params;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: 'year required'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [r1] = await conn.query(
      'DELETE FROM archived_registrations WHERE archive_year = ?',
      [year]
    );

    const [r2] = await conn.query(
      'DELETE FROM archived_feedback WHERE archive_year = ?',
      [year]
    );

    const [r3] = await conn.query(
      'DELETE FROM archive_log WHERE archive_year = ?',
      [year]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: `Archive ${year} deleted successfully`,
      deleted: {
        registrations: r1.affectedRows,
        feedback: r2.affectedRows,
        logs: r3.affectedRows
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Delete failed'
    });
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
  deleteArchive
};