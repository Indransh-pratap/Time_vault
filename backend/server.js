const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Planner real-time sync
  socket.on('planner:update', async (data) => {
    console.log('[Socket] planner:update received');
    // Broadcast to ALL other clients (the sender already has optimistic state)
    socket.broadcast.emit('planner:sync', data);
  });

  // Alarm real-time sync
  socket.on('alarm:update', (data) => {
    console.log('[Socket] alarm:update received');
    // Broadcast to ALL other clients
    socket.broadcast.emit('alarm:sync', data);
  });

  // Note real-time sync
  socket.on('note:update', (data) => {
    console.log('[Socket] note:update received');
    socket.broadcast.emit('note:sync', data);
  });

  // Study session sync — client fires after a session stops
  socket.on('study:update', (data) => {
    console.log('[Socket] study:update received — broadcasting study:sync');
    // Broadcast to all other clients (sender already has optimistic state)
    socket.broadcast.emit('study:sync', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Make io accessible in controllers if needed
app.set('io', io);

// ── CORS ─────────────────────────────────────────────────────
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

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/tasks',      require('./routes/taskRoutes'));
app.use('/api/planner',    require('./routes/plannerRoutes'));
app.use('/api/targets',    require('./routes/targetRoutes'));
app.use('/api/analytics',  require('./routes/analyticsRoutes'));
app.use('/api/payments',   require('./routes/paymentRoutes'));
app.use('/api/timer',      require('./routes/timerRoutes'));
app.use('/api/timeline',   require('./routes/timelineRoutes'));
app.use('/api/objectives', require('./routes/objectiveRoutes'));
app.use('/api/alarm',      require('./routes/alarmRoutes'));
app.use('/api/notes',      require('./routes/noteRoutes'));
app.use('/api/xp',         require('./routes/xpRoutes'));

app.get('/', (req, res) => res.send('TimeVault Backend is running.'));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + Socket.io running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`   CORS origin: ${corsOptions.origin}`);
});
