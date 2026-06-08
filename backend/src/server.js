require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const routes = require('./routes/index');
const { startScheduler } = require('./utils/scheduler');

const app = express();

// =========================
// CORS CONFIGURATION
// =========================
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://snti-hostel-management.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// =========================
// MIDDLEWARE
// =========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =========================
// ROUTES
// =========================
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok'
  });
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SNTI Hostel Backend Running'
  });
});

// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found.'
  });
});

// =========================
// ERROR HANDLER
// =========================
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Server error.'
  });
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server on :${PORT}`);
      startScheduler();
    });
  })
  .catch((e) => {
    console.error('DB failed:', e.message);
    process.exit(1);
  });
