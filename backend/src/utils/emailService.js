const nodemailer = require('nodemailer');
const { pool } = require('../config/db');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailConfigured = () =>
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
  padding:20px;
}
.container{
  max-width:540px;
  margin:0 auto;
  background:#fff;
  border-radius:12px;
  overflow:hidden;
  box-shadow:0 2px 12px rgba(0,0,0,.08);
}
.header{
  background:#1e40af;
  color:#fff;
  padding:24px 28px;
}
.header h1{
  margin:0;
  font-size:18px;
}
.header p{
  margin:4px 0 0;
  font-size:12px;
  opacity:.85;
}
.body{
  padding:24px 28px;
  color:#374151;
  line-height:1.6;
}
.body h2{
  color:#1e40af;
  margin-top:0;
}
.box{
  background:#f0f4ff;
  padding:12px 16px;
  border-radius:8px;
  margin:14px 0;
}
.row{
  display:flex;
  justify-content:space-between;
  padding:5px 0;
  border-bottom:1px solid #e5e7eb;
}
.row:last-child{
  border-bottom:none;
}
.label{
  color:#6b7280;
  font-weight:500;
}
.value{
  color:#111827;
  font-weight:600;
}
.footer{
  background:#f9fafb;
  padding:14px 28px;
  text-align:center;
  font-size:11px;
  color:#9ca3af;
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>SNTI Hostel Mess</h1>
    <p>Mess Registration & Smart Menu System</p>
  </div>

  <div class="body">
    <h2>${title}</h2>
    ${body}
  </div>

  <div class="footer">
    Automated message from SNTI Hostel Mess. Please do not reply.
  </div>
</div>
</body>
</html>
`;

const logEmail = async (userId, type, status) => {
  try {
    await pool.query(
      'INSERT INTO email_logs (user_id,email_type,status) VALUES (?,?,?)',
      [userId, type, status]
    );
  } catch (err) {
    console.error('Email log error:', err.message);
  }
};

const sendEmail = async (to, subject, html, userId, type) => {
  try {
    if (!emailConfigured()) {
      console.warn('Email credentials not configured.');
      return false;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    await logEmail(userId, type, 'sent');
    return true;
  } catch (err) {
    console.error(`Email send failed (${type}):`, err.message);

    try {
      await logEmail(userId, type, 'failed');
    } catch {}

    return false;
  }
};

const sendRegistrationSuccess = async (user, registration) => {
  return sendEmail(
    user.email,
    'Mess Registration Confirmed - SNTI',
    wrap(
      'Registration Confirmed',
      `
      <p>Hello <strong>${user.name}</strong>, your registration has been confirmed.</p>

      <div class="box">
        <div class="row">
          <span class="label">Mess Type</span>
          <span class="value">${registration.mess_type}</span>
        </div>

        <div class="row">
          <span class="label">Registration Date</span>
          <span class="value">${registration.registration_date}</span>
        </div>

        <div class="row">
          <span class="label">Expiry Date</span>
          <span class="value">${registration.expiry_date}</span>
        </div>
      </div>
      `
    ),
    user.id,
    'registration_success'
  );
};

const sendApprovalNotification = async (user, approved) => {
  return sendEmail(
    user.email,
    approved ? 'Registration Approved' : 'Registration Rejected',
    wrap(
      approved ? 'Registration Approved' : 'Registration Rejected',
      approved
        ? `<p>Hello <strong>${user.name}</strong>, your registration has been approved.</p>`
        : `<p>Hello <strong>${user.name}</strong>, your registration has been rejected. Please contact the administrator.</p>`
    ),
    user.id,
    approved ? 'approval' : 'rejection'
  );
};

const sendExpiryWarning = async (user, expiryDate) => {
  return sendEmail(
    user.email,
    'Mess Registration Expiring Soon',
    wrap(
      'Expiry Warning',
      `
      <p>Hello <strong>${user.name}</strong>,</p>

      <p>Your registration will expire on:</p>

      <div class="box">
        <strong>${expiryDate}</strong>
      </div>

      <p>Please renew before expiry.</p>
      `
    ),
    user.id,
    'expiry_warning'
  );
};

const sendDailyMenuReminder = async (user, menu) => {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return sendEmail(
    user.email,
    `Today's Menu - ${today}`,
    wrap(
      "Today's Menu",
      `
      <p>Hello <strong>${user.name}</strong>,</p>

      <div class="box">
        <div class="row">
          <span class="label">Breakfast</span>
          <span class="value">${menu.breakfast || 'Not Selected'}</span>
        </div>

        <div class="row">
          <span class="label">Lunch</span>
          <span class="value">${menu.lunch || 'Not Selected'}</span>
        </div>

        <div class="row">
          <span class="label">Dinner</span>
          <span class="value">${menu.dinner || 'Not Selected'}</span>
        </div>
      </div>
      `
    ),
    user.id,
    'menu_reminder'
  );
};

const sendDeactivationEmail = async (user) => {
  const deletionDate = new Date(
    Date.now() + 48 * 60 * 60 * 1000
  ).toLocaleString('en-IN');

  return sendEmail(
    user.email,
    'Account Deactivated - SNTI Hostel Mess',
    wrap(
      'Account Deactivated',
      `
      <p>Hello <strong>${user.name}</strong>,</p>

      <p>Your account has been deactivated.</p>

      <div class="box">
        <div class="row">
          <span class="label">Email</span>
          <span class="value">${user.email}</span>
        </div>

        <div class="row">
          <span class="label">Permanent Deletion</span>
          <span class="value">${deletionDate}</span>
        </div>
      </div>

      <p>
        If this action was not expected, contact the administrator before the deletion deadline.
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
  sendDeactivationEmail
};