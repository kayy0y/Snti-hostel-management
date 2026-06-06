require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

(async () => {
  const db   = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const hash = await bcrypt.hash('Admin@1234', 12);
  const [res] = await db.execute(
    "UPDATE users SET password = ? WHERE email = 'admin@snti.com'",
    [hash]
  );
  console.log(res.affectedRows
    ? 'Admin password set to Admin@1234'
    : 'Admin user not found — run schema.sql first');
  await db.end();
})().catch(e => { console.error(e.message); process.exit(1); });
