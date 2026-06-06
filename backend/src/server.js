require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { connectDB } = require('./config/db');
const routes  = require('./routes/index');
const { startScheduler } = require('./utils/scheduler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', routes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use((_, res) => res.status(404).json({ success: false, message: 'Not found.' }));
app.use((err, _, res, __) => { console.error(err); res.status(500).json({ success: false, message: 'Server error.' }); });

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => { console.log(`Server on :${PORT}`); startScheduler(); });
}).catch(e => { console.error('DB failed:', e.message); process.exit(1); });
