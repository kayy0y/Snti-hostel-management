const { pool } = require('../config/db');
const { validationResult } = require('express-validator');

const submitFeedback = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, message: errs.array()[0].msg });
  const { rating, category, comments } = req.body;
  try {
    await pool.query('INSERT INTO feedback (user_id,rating,category,comments) VALUES (?,?,?,?)',
      [req.user.id, rating, category, comments||null]);
    return res.status(201).json({ success: true, message: 'Feedback submitted. Thank you!' });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getAllFeedback = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*,u.name,u.email,u.hostel_block FROM feedback f JOIN users u ON f.user_id=u.id ORDER BY f.created_at DESC`
    );
    const [[stats]] = await pool.query(
      `SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS total,
              SUM(rating=5) AS five_star, SUM(rating=4) AS four_star, SUM(rating=3) AS three_star,
              SUM(rating=2) AS two_star, SUM(rating=1) AS one_star FROM feedback`
    );
    return res.json({ success: true, data: rows, analytics: stats });
  } catch (e) { return res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { submitFeedback, getAllFeedback };
