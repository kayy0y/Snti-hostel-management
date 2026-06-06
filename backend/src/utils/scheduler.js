const cron = require('node-cron');
const { pool } = require('../config/db');
const { sendExpiryWarning, sendDailyMenuReminder } = require('./emailService');

const getMonday = () => {
  const n=new Date(),d=n.getDay(),m=new Date(n);
  m.setDate(n.getDate()+(d===0?-6:1-d));
  return m.toISOString().split('T')[0];
};

const runExpiryCleanup = async () => {
  await pool.query("UPDATE registrations SET status='expired' WHERE expiry_date<CURDATE() AND status='active'");
  await pool.query("UPDATE users u JOIN registrations r ON u.id=r.user_id SET u.is_active=0 WHERE r.status='expired' AND u.is_active=1 AND u.role IN ('student','external')");
  console.log('[Scheduler] Expiry cleanup done');
};

const runExpiryWarnings = async () => {
  const [rows] = await pool.query("SELECT u.id,u.name,u.email,r.expiry_date FROM registrations r JOIN users u ON r.user_id=u.id WHERE r.status='active' AND r.expiry_date=DATE_ADD(CURDATE(),INTERVAL 3 DAY) AND u.is_active=1");
  for (const u of rows) await sendExpiryWarning(u, u.expiry_date);
  console.log(`[Scheduler] Expiry warnings: ${rows.length}`);
};

const runMenuReminders = async () => {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = days[new Date().getDay()];
  const week  = getMonday();
  const [rows] = await pool.query(
    `SELECT u.id,u.name,u.email,ms.breakfast,ms.lunch,ms.dinner FROM menu_selections ms
     JOIN users u ON ms.user_id=u.id JOIN registrations r ON u.id=r.user_id
     WHERE ms.week_start=? AND ms.day_name=? AND r.status='active' AND u.is_active=1`,
    [week, today]
  );
  for (const u of rows) await sendDailyMenuReminder(u, u);
  console.log(`[Scheduler] Menu reminders: ${rows.length}`);
};

const runWeeklyReset = async () => {
  const w = getMonday();
  const last = new Date(w); last.setDate(last.getDate()-7);
  const [r] = await pool.query('DELETE FROM menu_selections WHERE week_start<?', [last.toISOString().split('T')[0]]);
  console.log(`[Scheduler] Weekly reset: ${r.affectedRows} old rows`);
};

const startScheduler = () => {
  cron.schedule('0 0 * * *', runExpiryCleanup,  { timezone:'Asia/Kolkata' });
  cron.schedule('0 9 * * *', runExpiryWarnings, { timezone:'Asia/Kolkata' });
  cron.schedule('0 7 * * *', runMenuReminders,  { timezone:'Asia/Kolkata' });
  cron.schedule('1 0 * * 1', runWeeklyReset,    { timezone:'Asia/Kolkata' });
  console.log('Schedulers started (IST)');
};

module.exports = { startScheduler };
