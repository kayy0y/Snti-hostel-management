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
    await pool.query(
      "UPDATE users SET is_active = 0 WHERE id = ?",
      [req.params.id]
    );

    return res.json({
      success: true,
      message: "Student deactivated."
    });
  } catch (e) {
    console.error("DELETE STUDENT ERROR:", e);

    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
};

// ─── POST /api/student/deactivate ─────────────────────────────────────────
// Student deactivates their own account — logged out, can reactivate by logging in
const deactivateSelf = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_active=0, deactivated_at=NOW(), pending_deletion=0 WHERE id=?',
      [req.user.id]
    );
    // pending_deletion=0 means student can reactivate by logging in — no auto-delete
    return res.json({ success: true, message: 'Account deactivated. Log in again to reactivate.' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

// ─── DELETE /api/student/delete-account ───────────────────────────────────
// Student hard-deletes their own account immediately.

const deleteSelf = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email confirmation required.' });
  if (email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(400).json({ success: false, message: 'Email does not match your account.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Snapshot registrations to archive before deleting
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

    // Snapshot feedback to archive
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

    // Hard delete the user (CASCADE handles registrations, feedback, menu_selections, email_logs)
    await conn.query('DELETE FROM users WHERE id=?', [req.user.id]);

    await conn.commit();
    return res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (e) {
    await conn.rollback();
    console.error('deleteSelf error:', e);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

const deleteExpiredUsers = async (req, res) => {
  try {
    await pool.query("UPDATE registrations SET status='expired' WHERE expiry_date<CURDATE() AND status='active'");
    const [r] = await pool.query(
      `UPDATE users u JOIN registrations reg ON u.id=reg.user_id
       SET u.is_active=0 WHERE reg.status='expired' AND u.is_active=1 AND u.role IN ('student','external')`
    );
    return res.json({ success: true, message: `${r.affectedRows} accounts deactivated.` });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getDashboardStats = async (req, res) => {
  try {
    const [[{ total }]]    = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role IN ('student','external') AND is_active=1");
    const [[{ regs }]]     = await pool.query("SELECT COUNT(*) AS regs FROM registrations WHERE status='active'");
    const [[{ avg }]]      = await pool.query("SELECT ROUND(AVG(rating),1) AS avg FROM feedback");
    const [[{ expiring }]] = await pool.query("SELECT COUNT(*) AS expiring FROM registrations WHERE status='active' AND expiry_date<=DATE_ADD(CURDATE(),INTERVAL 7 DAY)");
    const [[{ pending }]]  = await pool.query("SELECT COUNT(*) AS pending FROM registrations WHERE approval_status='pending'");
    const [breakdown]      = await pool.query("SELECT mess_type,COUNT(*) AS count FROM registrations WHERE status='active' GROUP BY mess_type");
    return res.json({ success: true, data: { total_students: total, total_registrations: regs, avg_rating: avg||0, expiring_soon: expiring, pending_approvals: pending, mess_breakdown: breakdown } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getQuickAnalytics = async (req, res) => {
  try {
    const week = (() => { const n=new Date(),d=n.getDay(),m=new Date(n); m.setDate(n.getDate()+(d===0?-6:1-d)); return m.toISOString().split('T')[0]; })();
    const top = async (col) => {
      const [[r]] = await pool.query(`SELECT ${col} AS item,COUNT(*) AS count FROM menu_selections WHERE week_start=? AND ${col} IS NOT NULL GROUP BY ${col} ORDER BY count DESC LIMIT 1`, [week]);
      return r || null;
    };
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM registrations WHERE approval_status='pending'");
    return res.json({ success: true, data: { top_breakfast: await top('breakfast'), top_lunch: await top('lunch'), top_dinner: await top('dinner'), pending_approvals: pending } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const exportReport = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT u.name,u.email,u.trainee_id,u.trainee_type,u.hostel_block,u.member_type,u.phone,
              r.mess_type,r.registration_date,r.expiry_date,r.status,r.approval_status
       FROM users u LEFT JOIN registrations r ON u.id=r.user_id AND r.status='active'
       WHERE u.role IN ('student','external') AND u.is_active=1 ORDER BY u.name`
    );
    const [fb] = await pool.query(`SELECT u.name,u.email,f.rating,f.category,f.comments,f.created_at FROM feedback f JOIN users u ON f.user_id=u.id ORDER BY f.created_at DESC`);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students.map(s => ({
      Name: s.name, Email: s.email, 'Trainee ID': s.trainee_id, Type: s.trainee_type||s.member_type,
      Block: s.hostel_block, Phone: s.phone, 'Mess Type': s.mess_type||'Not Registered',
      'Reg Date': s.registration_date||'-', 'Expiry': s.expiry_date||'-', Status: s.status||'-',
    }))), 'Students');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fb), 'Feedback');
    res.setHeader('Content-Disposition','attachment; filename=snti_report.xlsx');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(XLSX.write(wb, { type:'buffer', bookType:'xlsx' }));
  } catch (e) { return res.status(500).json({ success: false, message: 'Export failed.' }); }
};

const exportPDF = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT u.name,u.email,u.trainee_id,u.trainee_type,u.hostel_block,u.member_type,
              r.mess_type,r.registration_date,r.expiry_date,r.approval_status
       FROM users u LEFT JOIN registrations r ON u.id=r.user_id AND r.status='active'
       WHERE u.role IN ('student','external') AND u.is_active=1 ORDER BY u.name`
    );
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename=snti_report.pdf');
    doc.pipe(res);
    doc.rect(0,0,doc.page.width,70).fill('#1e40af');
    doc.fillColor('#fff').fontSize(18).font('Helvetica-Bold').text('SNTI Hostel Mess — Report', 40, 22);
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 46);
    let y = 95;
    doc.fillColor('#1e40af').fontSize(13).font('Helvetica-Bold').text('Student Registrations', 40, y); y += 20;
    const cols = [40,160,255,340,420,510];
    const heads = ['Name','Trainee ID','Type','Mess','Expiry','Status'];
    doc.rect(40,y-2,doc.page.width-80,16).fill('#dbeafe');
    doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold');
    heads.forEach((h,i) => doc.text(h, cols[i], y, { width: (cols[i+1]||560)-cols[i]-4 }));
    y += 18; doc.moveTo(40,y).lineTo(doc.page.width-40,y).strokeColor('#e5e7eb').stroke(); y += 4;
    doc.font('Helvetica').fontSize(8);
    students.forEach((s,idx) => {
      if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
      if (idx%2===0) doc.rect(40,y-2,doc.page.width-80,15).fill('#f9fafb');
      doc.fillColor('#111');
      doc.text((s.name||'').slice(0,18), cols[0], y, { width: 116 });
      doc.text(s.trainee_id||'-', cols[1], y, { width: 91 });
      doc.text((s.trainee_type||s.member_type||'-').slice(0,12), cols[2], y, { width: 81 });
      doc.text(s.mess_type||'Not Reg.', cols[3], y, { width: 76 });
      doc.text(s.expiry_date||'-', cols[4], y, { width: 86 });
      doc.fillColor(s.approval_status==='approved'?'#15803d':s.approval_status==='pending'?'#a16207':'#6b7280')
         .text(s.approval_status||s.status||'-', cols[5], y, { width: 50 });
      y += 15;
    });
    doc.end();
  } catch (e) { if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF failed.' }); }
};

const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name||!email||!password||password.length<8) return res.status(400).json({ success: false, message: 'Name, email, password (min 8) required.' });
  try {
    const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (ex.length) return res.status(409).json({ success: false, message: 'Email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [r]  = await pool.query("INSERT INTO users (name,email,password,role) VALUES (?,?,?,'admin')", [name, email, hash]);
    return res.status(201).json({ success: true, message: `Admin ${name} created.`, data: { id: r.insertId, name, email } });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getAdminList = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id,name,email,is_active,created_at FROM users WHERE role='admin' ORDER BY created_at");
    return res.json({ success: true, data: rows });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getAnalytics = async (req, res) => {
  try {
    const week = (() => { const n=new Date(),d=n.getDay(),m=new Date(n); m.setDate(n.getDate()+(d===0?-6:1-d)); return m.toISOString().split('T')[0]; })();
    const topItems = async (col, limit=5) => {
      const [r] = await pool.query(`SELECT ${col} AS item,COUNT(*) AS count FROM menu_selections WHERE week_start=? AND ${col} IS NOT NULL GROUP BY ${col} ORDER BY count DESC LIMIT ?`, [week, limit]);
      return r;
    };
    const [trend]   = await pool.query("SELECT DATE(registration_date) AS date,COUNT(*) AS count FROM registrations WHERE registration_date>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) GROUP BY DATE(registration_date) ORDER BY date");
    const [peak]    = await pool.query("SELECT DAYNAME(registration_date) AS day,COUNT(*) AS count FROM registrations GROUP BY DAYNAME(registration_date) ORDER BY count DESC");
    const [members] = await pool.query("SELECT member_type,COUNT(*) AS count FROM users WHERE is_active=1 AND role IN ('student','external') GROUP BY member_type");
    const [[cov]]   = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role IN ('student','external') AND is_active=1");
    const [[sel]]   = await pool.query("SELECT COUNT(DISTINCT user_id) AS selected FROM menu_selections WHERE week_start=?", [week]);
    const [[{ pending }]] = await pool.query("SELECT COUNT(*) AS pending FROM registrations WHERE approval_status='pending'");
    return res.json({ success: true, data: {
      week_start: week, pending_approvals: pending,
      menu_popularity: { breakfast: await topItems('breakfast'), lunch: await topItems('lunch'), dinner: await topItems('dinner') },
      registration_trend: trend, peak_day: peak, member_breakdown: members,
      menu_coverage: { total_students: cov.total, selected_this_week: sel.selected },
    }});
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getAllStudents, addStudent, deleteStudent, deactivateSelf, deleteSelf, deleteExpiredUsers, getDashboardStats, getQuickAnalytics, exportReport, exportPDF, createAdmin, getAdminList, getAnalytics };