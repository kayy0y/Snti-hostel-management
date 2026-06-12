const { pool } = require('../config/db');
const { sendPaymentConfirmation } = require('../utils/emailService');

// ─── GET /api/payments/:user_id ───────────────────────────────────────────
const getPaymentHistory = async (req, res) => {

  const { user_id } = req.params;

  try {

    const [userRows] = await pool.query(
      `
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        member_type
      FROM users
      WHERE id = ?
      `,
      [user_id]
    );


    if (!userRows.length) {
      return res.status(404).json({
        success:false,
        message:'Member not found.'
      });
    }


    const [payments] = await pool.query(
      `
      SELECT
        p.id,
        p.amount,
        p.payment_method,
        p.transaction_ref,
        p.status,
        p.payment_date,
        p.period_start,
        p.period_end,
        p.notes,

        u.name AS verified_by_name,

        r.expiry_date AS current_expiry

      FROM payment_records p

      LEFT JOIN users u
      ON p.verified_by = u.id

      LEFT JOIN registrations r
      ON p.registration_id = r.id

      WHERE p.user_id = ?

      ORDER BY 
      p.created_at DESC
      `,
      [user_id]
    );


    const totalPaid = payments
      .filter(p => p.status === 'verified')
      .reduce(
        (sum,p)=> sum + Number(p.amount),
        0
      );


    const totalPayments = payments.filter(
      p=>p.status==='verified'
    ).length;


    const pending = payments.filter(
      p=>p.status==='pending'
    ).length;


    return res.json({

      success:true,

      data:{
        member:userRows[0],

        payments,

        stats:{
          totalPaid,
          totalPayments,
          pending
        }

      }

    });


  } catch(err){

    console.error("Payment history error:",err);

    return res.status(500).json({
      success:false,
      message:err.message
    });

  }

};
// ─── POST /api/payments/record ────────────────────────────────────────────
const recordPayment = async (req, res) => {
  const { user_id, amount, payment_method, transaction_ref, notes, payment_date } = req.body;

  if (!user_id || !amount)
    return res.status(400).json({ success: false, message: 'user_id and amount are required.' });
  if (Number(amount) <= 0)
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [regRows] = await conn.query(
      `SELECT r.id AS reg_id, r.expiry_date, u.name, u.email
       FROM registrations r JOIN users u ON r.user_id = u.id
       WHERE r.user_id = ? AND r.status = 'active' AND u.role = 'external'`,
      [user_id]
    );
    if (!regRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'No active registration for this external member.' });
    }

    const reg         = regRows[0];
    const pDate       = payment_date || new Date().toISOString().split('T')[0];
    const newExpiry   = new Date(reg.expiry_date);
    newExpiry.setDate(newExpiry.getDate() + 30);
    const periodEnd   = newExpiry.toISOString().split('T')[0];

    const [result] = await conn.query(
      `INSERT INTO payment_records
         (user_id, registration_id, amount, payment_method, transaction_ref,
          status, verified_by, verified_at, notes, payment_date, period_start, period_end)
       VALUES (?, ?, ?, ?, ?, 'verified', ?, NOW(), ?, ?, ?, ?)`,
      [user_id, reg.reg_id, amount, payment_method || 'Cash', transaction_ref || null,
       req.user.id, notes || null, pDate, pDate, periodEnd]
    );

    await conn.query('UPDATE registrations SET expiry_date = ? WHERE id = ?', [periodEnd, reg.reg_id]);
    await conn.commit();

    sendPaymentConfirmation(
  {
    id: user_id,
    name: reg.name,
    email: reg.email
  },
  {
    amount,
    payment_date: pDate,
    payment_method: payment_method || 'Cash',
    transaction_ref
  },
  periodEnd
).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded. Access extended to ${periodEnd}.`,
      data: { payment_id: result.insertId, new_expiry: periodEnd },
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ─── PUT /api/payments/:payment_id/verify ─────────────────────────────────
const verifyPayment = async (req, res) => {
  const { action, notes } = req.body;
  if (!['verify','reject'].includes(action))
    return res.status(400).json({ success: false, message: "Action must be 'verify' or 'reject'." });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT p.*, u.name, u.email, r.expiry_date
       FROM payment_records p
       JOIN users u ON p.user_id = u.id
       JOIN registrations r ON p.registration_id = r.id
       WHERE p.id = ? AND p.status = 'pending'`,
      [req.params.payment_id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Pending payment not found.' });

    const payment = rows[0];

    if (action === 'reject') {
      await conn.query(
        'UPDATE payment_records SET status = ?, verified_by = ?, verified_at = NOW(), notes = ? WHERE id = ?',
        ['rejected', req.user.id, notes || null, req.params.payment_id]
      );
      return res.json({ success: true, message: 'Payment rejected.' });
    }

    await conn.beginTransaction();

    const newExpiry = new Date(payment.expiry_date);
    newExpiry.setDate(newExpiry.getDate() + 30);
    const newExpiryStr = newExpiry.toISOString().split('T')[0];

    await conn.query(
      'UPDATE payment_records SET status = ?, verified_by = ?, verified_at = NOW(), notes = ?, period_end = ? WHERE id = ?',
      ['verified', req.user.id, notes || null, newExpiryStr, req.params.payment_id]
    );
    await conn.query('UPDATE registrations SET expiry_date = ? WHERE id = ?', [newExpiryStr, payment.registration_id]);
    await conn.commit();

    sendPaymentConfirmation(
  {
    id: payment.user_id,
    name: payment.name,
    email: payment.email
  },
  {
    amount: payment.amount,
    payment_date: payment.payment_date,
    payment_method: payment.payment_method,
    transaction_ref: payment.transaction_ref
  },
  newExpiryStr
).catch(() => {});

    return res.json({ success: true, message: `Payment verified. Access extended to ${newExpiryStr}.`, data: { new_expiry: newExpiryStr } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
};

// ─── GET /api/payments/pending ────────────────────────────────────────────
const getPendingPayments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name, u.email, u.phone
       FROM payment_records p JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending' ORDER BY p.created_at ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getPaymentHistory, recordPayment, verifyPayment, getPendingPayments };