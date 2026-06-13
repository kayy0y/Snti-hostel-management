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

// Runs every Monday 00:01 IST.
// Deletes LAST week's weekly_menu_plan, menu_selection_items, and menu_selections —
// so admin only ever sees the current week by default once a new week starts.
const runWeeklyReset = async () => {
  const currentWeek = getMonday();
  const lastWeek = new Date(currentWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  const [planResult] = await pool.query(
    'DELETE FROM weekly_menu_plan WHERE week_start = ?',
    [lastWeekStr]
  );
  const [itemsResult] = await pool.query(
    'DELETE FROM menu_selection_items WHERE week_start = ?',
    [lastWeekStr]
  );
  const [legacyResult] = await pool.query(
    'DELETE FROM menu_selections WHERE week_start = ?',
    [lastWeekStr]
  );

  console.log(`[Scheduler] Weekly reset for ${lastWeekStr}: ${planResult.affectedRows} plan items, ${itemsResult.affectedRows} selections, ${legacyResult.affectedRows} legacy rows removed.`);
};

// ── Hard-delete accounts pending deletion after 48hrs ────────────────────
// Runs daily at 1am. Finds users deactivated by admin 48+hrs ago.
// Keeps their registration + feedback rows in archive tables (already handled
// by deleteStudent which snapshots before deactivating if needed — but since
// CASCADE is on, we must archive first here too).
const runPendingDeletions = async () => {
  try {
    console.log('[Scheduler] Checking pending deletions...');
    const [users] = await pool.query(
      `SELECT id, name, email FROM users
       WHERE pending_deletion=1
         AND is_active=0
         AND deactivated_at IS NOT NULL
         AND deactivated_at <= DATE_SUB(NOW(), INTERVAL 48 HOUR)`
    );

    if (!users.length) { console.log('[Scheduler] No pending deletions.'); return; }

    for (const user of users) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Snapshot to archive before deleting (avoid CASCADE data loss)
        await conn.query(
          `INSERT IGNORE INTO archived_registrations (
             id, user_id, mess_type, registration_date, expiry_date, status,
             payment_proof, approval_status, approved_by, approved_at, created_at,
             user_name, user_email, user_phone, user_trainee_id, user_trainee_type,
             user_hostel_block, user_member_type, user_role, archive_year, archived_by
           )
           SELECT r.id, r.user_id, r.mess_type, r.registration_date, r.expiry_date, r.status,
                  r.payment_proof, r.approval_status, r.approved_by, r.approved_at, r.created_at,
                  u.name, u.email, u.phone, u.trainee_id, u.trainee_type,
                  u.hostel_block, u.member_type, u.role, YEAR(NOW()), u.id
           FROM registrations r JOIN users u ON r.user_id=u.id WHERE r.user_id=?`,
          [user.id]
        );
        await conn.query(
          `INSERT IGNORE INTO archived_feedback (
             id, user_id, rating, category, comments, created_at,
             user_name, user_email, archive_year, archived_by
           )
           SELECT f.id, f.user_id, f.rating, f.category, f.comments, f.created_at,
                  u.name, u.email, YEAR(NOW()), u.id
           FROM feedback f JOIN users u ON f.user_id=u.id WHERE f.user_id=?`,
          [user.id]
        );

        // Hard delete user (CASCADE removes registrations, feedback, etc.)
        await conn.query('DELETE FROM users WHERE id=?', [user.id]);
        await conn.commit();
        console.log(`[Scheduler] Permanently deleted user: ${user.email}`);
      } catch (err) {
        await conn.rollback();
        console.error(`[Scheduler] Failed to delete ${user.email}:`, err.message);
      } finally {
        conn.release();
      }
    }
    console.log(`[Scheduler] Pending deletions done. ${users.length} accounts removed.`);
  } catch (err) {
    console.error('[Scheduler] Pending deletion error:', err.message);
  }
};

const startScheduler = () => {
  cron.schedule('0 0 * * *', runExpiryCleanup,    { timezone:'Asia/Kolkata' });
  cron.schedule('0 9 * * *', runExpiryWarnings,   { timezone:'Asia/Kolkata' });
  cron.schedule('0 7 * * *', runMenuReminders,    { timezone:'Asia/Kolkata' });
  cron.schedule('1 0 * * 1', runWeeklyReset,      { timezone:'Asia/Kolkata' });
  cron.schedule('0 1 * * *', runPendingDeletions, { timezone:'Asia/Kolkata' }); // 1am daily
  console.log('Schedulers started (IST): expiry, warnings, reminders, menu reset, pending deletions');
};

module.exports = { startScheduler };