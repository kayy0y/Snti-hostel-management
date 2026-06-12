const nodemailer = require('nodemailer');
const { pool } = require('../config/db');

const t = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const ok = () =>
  !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const wrap = (title, body) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{
  font-family:'Segoe UI',Arial,sans-serif;
  background:#f4f6fb;
  margin:0;
  padding:20px
}
.c{
  max-width:540px;
  margin:0 auto;
  background:#fff;
  border-radius:12px;
  overflow:hidden;
  box-shadow:0 2px 12px rgba(0,0,0,.08)
}
.h{
  background:#1e40af;
  color:#fff;
  padding:24px 28px
}
.h h1{
  margin:0;
  font-size:18px;
  font-weight:700
}
.h p{
  margin:4px 0 0;
  font-size:12px;
  opacity:.8
}
.b{
  padding:24px 28px;
  color:#374151;
  line-height:1.6
}
.b h2{
  font-size:16px;
  color:#1e40af;
  margin-top:0
}
.row{
  display:flex;
  justify-content:space-between;
  padding:5px 0;
  border-bottom:1px solid #f0f4ff
}
.row:last-child{
  border-bottom:none
}
.lbl{
  color:#6b7280;
  font-weight:500
}
.val{
  color:#111;
  font-weight:600
}
.box{
  background:#f0f4ff;
  border-radius:8px;
  padding:12px 16px;
  margin:14px 0
}
.f{
  background:#f9fafb;
  padding:14px 28px;
  font-size:11px;
  color:#9ca3af;
  text-align:center
}
</style>
</head>
<body>
<div class="c">
  <div class="h">
    <h1>SNTI Hostel Mess</h1>
    <p>Mess Registration & Smart Menu System</p>
  </div>

  <div class="b">
    <h2>${title}</h2>
    ${body}
  </div>

  <div class="f">
    Automated message from SNTI Hostel Mess. Do not reply.
  </div>
</div>
</body>
</html>
`;

const log = async (uid, type, status) => {
  try {
    await pool.query(
      'INSERT INTO email_logs (user_id,email_type,status) VALUES (?,?,?)',
      [uid, type, status]
    );
  } catch {}
};

const send = async (to, subject, html, uid, type) => {
  if (!ok()) return;

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    await log(uid, type, 'sent');
  } catch (e) {
    console.error(`[Email] ${type}:`, e.message);
    await log(uid, type, 'failed');
  }
};

const sendRegistrationSuccess = (user, reg) =>
  send(
    user.email,
    'Mess Registration Confirmed - SNTI',
    wrap(
      'Registration Confirmed',
      `
      <p>Hello <strong>${user.name}</strong>, your mess registration is confirmed.</p>

      <div class="box">
        <div class="row">
          <span class="lbl">Mess Type</span>
          <span class="val">${reg.mess_type}</span>
        </div>

        <div class="row">
          <span class="lbl">Valid From</span>
          <span class="val">${reg.registration_date}</span>
        </div>

        <div class="row">
          <span class="lbl">Expires On</span>
          <span class="val">${reg.expiry_date}</span>
        </div>
      </div>
      `
    ),
    user.id,
    'reg_success'
  );

const sendApprovalNotification = (user, approved) =>
  send(
    user.email,
    approved
      ? 'Mess Access Approved'
      : 'Registration Rejected',
    wrap(
      approved ? 'Access Approved' : 'Rejected',
      approved
        ? `
          <p>Hello <strong>${user.name}</strong>,
          your mess-only membership has been
          <strong style="color:#15803d">approved</strong>.
          Access is valid for 30 days.</p>
        `
        : `
          <p>Hello <strong>${user.name}</strong>,
          your registration was
          <strong style="color:#dc2626">rejected</strong>.
          Contact admin for details.</p>
        `
    ),
    user.id,
    approved ? 'approval' : 'rejection'
  );

const sendExpiryWarning = (user, expiry) =>
  send(
    user.email,
    'Mess Registration Expiring Soon',
    wrap(
      'Expiring Soon',
      `
      <p>Hello <strong>${user.name}</strong>,
      your registration expires on
      <strong style="color:#dc2626">${expiry}</strong>
      (3 days from now).</p>

      <p>Please contact the mess office to renew.</p>
      `
    ),
    user.id,
    'expiry_warning'
  );

const sendDailyMenuReminder = (user, menu) => {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return send(
    user.email,
    `Today's Menu - ${today}`,
    wrap(
      "Today's Menu",
      `
      <p>Hello <strong>${user.name}</strong>,
      here is your menu for <strong>${today}</strong>:</p>

      <div class="box">
        <div class="row">
          <span class="lbl">Breakfast</span>
          <span class="val">${menu.breakfast || 'Not selected'}</span>
        </div>

        ${
          menu.lunch
            ? `
            <div class="row">
              <span class="lbl">Lunch</span>
              <span class="val">${menu.lunch}</span>
            </div>
          `
            : ''
        }

        ${
          menu.dinner
            ? `
            <div class="row">
              <span class="lbl">Dinner</span>
              <span class="val">${menu.dinner}</span>
            </div>
          `
            : ''
        }
      </div>
      `
    ),
    user.id,
    'menu_reminder'
  );
};

const sendPaymentConfirmation = (
  user,
  payment,
  newExpiry
) =>
  send(
    user.email,
    'Payment Received — SNTI Hostel Mess',
    wrap(
      'Payment Confirmed',
      `
      <p>Hello <strong>${user.name}</strong>,</p>

      <p>Your payment has been
      <strong style="color:#15803d">verified</strong>
      by the admin.</p>

      <div class="box">

        <div class="row">
          <span class="lbl">Amount Paid</span>
          <span class="val">₹${payment.amount}</span>
        </div>

        <div class="row">
          <span class="lbl">Payment Date</span>
          <span class="val">${payment.payment_date}</span>
        </div>

        <div class="row">
          <span class="lbl">Method</span>
          <span class="val">${payment.payment_method}</span>
        </div>

        ${
          payment.transaction_ref
            ? `
            <div class="row">
              <span class="lbl">Transaction Ref</span>
              <span class="val">${payment.transaction_ref}</span>
            </div>
          `
            : ''
        }

        <div class="row">
          <span class="lbl">New Expiry Date</span>
          <span class="val" style="color:#15803d">
            <strong>${newExpiry}</strong>
          </span>
        </div>

      </div>
      `
    ),
    user.id,
    'payment_confirmation'
  );

const sendDeactivationEmail = (user) => {
  const deletionTime = new Date(
    Date.now() + 48 * 60 * 60 * 1000
  ).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return send(
    user.email,
    'Your SNTI Hostel Mess Account Has Been Deactivated',
    wrap(
      'Account Deactivated',
      `
      <p>Hello <strong>${user.name}</strong>,</p>

      <p>Your mess account has been
      <strong style="color:#dc2626">deactivated</strong>.</p>

      <div class="box">

        <div class="row">
          <span class="lbl">Account</span>
          <span class="val">${user.email}</span>
        </div>

        <div class="row">
          <span class="lbl">Deactivated On</span>
          <span class="val">${new Date().toLocaleString('en-IN')}</span>
        </div>

        <div class="row">
          <span class="lbl">Permanent Deletion</span>
          <span class="val" style="color:#dc2626">
            ${deletionTime}
          </span>
        </div>

      </div>

      <p style="font-size:13px;color:#6b7280">
        If this was done by mistake, please contact the mess admin
        immediately to restore your account before the deletion deadline.
        After <strong>${deletionTime}</strong>, your account may be
        permanently removed.
      </p>
      `
    ),
    user.id,
    'deactivation'
  );
};

module.exports = {
  sendRegistrationSuccess,
  sendApprovalNotification,
  sendExpiryWarning,
  sendDailyMenuReminder,
  sendPaymentConfirmation,
  sendDeactivationEmail
};