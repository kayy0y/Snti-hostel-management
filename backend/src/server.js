require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const routes = require('./routes/index');
const { startScheduler } = require('./utils/scheduler');

const app = express();

// =====================================
// CORS
// =====================================
const allowedOrigins = [
  'http://localhost:3000',
  'https://snti-hostel-management.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (typeof origin === 'string' && origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      console.log('Blocked CORS Origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
// =====================================
// BODY PARSERS
// =====================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// =====================================
// ROOT ROUTE
// =====================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SNTI Hostel Backend Running'
  });
});

// =====================================
// HEALTH CHECK
// =====================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok'
  });
});

// =====================================
// API ROUTES
// =====================================
app.use('/api', routes);

// =====================================
// 404 HANDLER
// =====================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found.'
  });
});

// =====================================
// ERROR HANDLER
// =====================================
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startScheduler();
    console.log("DB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB failed:", err.message);
  });

module.exports = app;