const jwt  = require('jsonwebtoken');
const { pool } = require('../config/db');

const STUDENT_ROLES = ['student', 'external'];

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided.' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const [rows]  = await pool.query(
      'SELECT id,name,email,role,phone,trainee_id,trainee_type,hostel_block,member_type,is_active FROM users WHERE id=?',
      [decoded.id]
    );
    if (!rows.length || !rows[0].is_active)
      return res.status(401).json({ success: false, message: 'Account not found or disabled.' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

const studentOnly = (req, res, next) => {
  if (!STUDENT_ROLES.includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Student access required.' });
  next();
};

module.exports = { protect, adminOnly, studentOnly };
