require('dotenv').config();

const express = require('express');
const cors = require('cors');
const serverless = require("serverless-http");
const connectDB = require('./config/db');

// Routes
const playlistRoutes = require('./routes/playlistRoutes');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const targetRoutes = require('./routes/targetRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const timerRoutes = require('./routes/timerRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const objectiveRoutes = require('./routes/objectiveRoutes');
const alarmRoutes = require('./routes/alarmRoutes');
const noteRoutes = require('./routes/noteRoutes');
const xpRoutes = require('./routes/xpRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const codingRoutes = require('./routes/codingRoutes');
const chatRoute = require('./routes/chat'); // ✅ chatbot route
const uploadRoute = require('./routes/uploadProfile');

const app = express();

// ── Connect DB ──────────────────────────────────────────
// Efficiently connect to DB in a serverless environment (Caching Pattern)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB Connection Error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ── CORS ─────────────────────────────────────────────
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));

// ── Socket.io ───────────────────────────────────────
/* 
  ⚠️ IMPORTANT LIMITATION:
  Vercel Serverless Functions do NOT support WebSockets (Socket.io). 
  Socket.io server and listeners have been removed to ensure Vercel compatibility.
  Real-time features (sockets) will not work on Vercel. 
  Consider using polling, Server-Sent Events (SSE), or a third-party managed WebSocket service like Pusher/Ably.
*/

// Middleware to safely stub 'io' so existing routes don't crash when calling `req.app.get('io')`
app.use((req, res, next) => {
  if (!req.app.get('io')) {
    req.app.set('io', {
      emit: () => {}, 
      sockets: { emit: () => {} }
    });
  }
  next();
});

// ── Middleware ───────────────────────────────────────

// Stripe webhook (must come before express.json() to keep raw body parsing intact)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parser
app.use(express.json());

// ── Routes ──────────────────────────────────────────

// Basic routes
app.use('/api/playlist', playlistRoutes);
app.use('/api/contact', contactRoutes);

// Core app routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/alarm', alarmRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/coding', codingRoutes);

app.use("/api/upload-profile", uploadRoute);

// 🤖 Chatbot route
app.use('/api/chat', chatRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ TimeVault Backend + AI running (Serverless Vercel Mode)');
});

// ── Serverless Export ────────────────────────────────
// Export the Express API wrapped with serverless-http

module.exports = app;
module.exports.handler = serverless(app);
