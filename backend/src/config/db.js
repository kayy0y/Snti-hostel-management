  const mysql = require('mysql2/promise');
  require('dotenv').config();

  const pool = mysql.createPool({
    host:            process.env.DB_HOST     || 'localhost',
    port:            process.env.DB_PORT     || 3306,
    user:            process.env.DB_USER     || 'root',
    password:        process.env.DB_PASSWORD || '',
    database:        process.env.DB_NAME     || 'snti_hostel',
    waitForConnections: true,
    connectionLimit: 10,
  });

  const connectDB = async () => {
    const conn = await pool.getConnection();
    console.log(`DB connected: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    conn.release();
  };

  module.exports = { pool, connectDB };
