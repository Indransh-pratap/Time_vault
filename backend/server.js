const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// CORS — allow all origins in development; lock down via FRONTEND_URL in production
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: process.env.FRONTEND_URL ? true : false,
};
app.use(cors(corsOptions));

// Stripe Webhook needs RAW body (must come before express.json)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/tasks',      require('./routes/taskRoutes'));
app.use('/api/planner',    require('./routes/plannerRoutes'));
app.use('/api/targets',    require('./routes/targetRoutes'));
app.use('/api/analytics',  require('./routes/analyticsRoutes'));
app.use('/api/payments',   require('./routes/paymentRoutes'));
app.use('/api/timer',      require('./routes/timerRoutes'));
app.use('/api/timeline',   require('./routes/timelineRoutes'));
app.use('/api/objectives', require('./routes/objectiveRoutes'));

app.get('/', (req, res) => res.send('TimeVault Backend is running.'));

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`   CORS origin: ${corsOptions.origin}`);
});

