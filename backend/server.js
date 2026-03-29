require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const uploadRoute = require('./routes/uploadProfile');
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
const chatRoute = require('./routes/chat'); // ✅ chatbot route

// Connect DB
connectDB();

const app = express();

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

// ── Server + Socket ──────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('planner:update', (data) => {
    socket.broadcast.emit('planner:sync', data);
  });

  socket.on('alarm:update', (data) => {
    socket.broadcast.emit('alarm:sync', data);
  });

  socket.on('note:update', (data) => {
    socket.broadcast.emit('note:sync', data);
  });

  socket.on('study:update', (data) => {
    socket.broadcast.emit('study:sync', data); // ✅ fixed
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ── Middleware ───────────────────────────────────────

// Stripe webhook (must come before JSON)
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

app.use("/api/upload-profile", uploadRoute);
// 🤖 Chatbot route
app.use('/api/chat', chatRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ TimeVault Backend + AI running');
});

// ── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins:`, corsOptions.origin);
});