const TimeSession = require('../models/TimeSession');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute the user's local date string with a 2 AM rollover rule.
 * Hours 00:00–01:59 are still counted as the previous day.
 *
 * @param {number} tzOffsetMinutes - minutes east of UTC (+330 for IST, -300 for EST)
 */
function getLocalDate(tzOffsetMinutes = 0) {
  const utcMs    = Date.now();
  const localMs  = utcMs + tzOffsetMinutes * 60_000;
  const localDate = new Date(localMs);
  const localHour = localDate.getUTCHours();

  // 2 AM rollover: treat midnight→2 AM as still being "yesterday"
  const effectiveMs = localHour < 2 ? localMs - 86_400_000 : localMs;
  const effective    = new Date(effectiveMs);

  const y = effective.getUTCFullYear();
  const m = String(effective.getUTCMonth() + 1).padStart(2, '0');
  const d = String(effective.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Emit study:sync for a user — sends daily total for the just-updated date. */
async function emitStudySync(io, userId, date) {
  try {
    const agg = await TimeSession.aggregate([
      { $match: { userId, date } },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]);
    const total = agg[0]?.total ?? 0;
    io.emit('study:sync', { userId, date, total });
  } catch (e) {
    console.error('[emitStudySync]', e.message);
  }
}

// ─── Controllers ───────────────────────────────────────────────────────────────

// POST /api/timer/session
const startSession = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Client sends its timezone offset so we compute the correct local date
    const tzOffset = Number(req.body.timezoneOffset) || 0; // minutes east of UTC
    const date = getLocalDate(tzOffset);
    const now  = new Date();

    const session = new TimeSession({ userId, startTime: now, date, type: 'manual', duration: 0 });
    await session.save();

    console.log(`[Timer] Session started — user:${userId} date:${date}`);
    res.status(201).json(session);
  } catch (err) {
    console.error('[startSession]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/timer/session/:id
const updateSession = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await TimeSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ message: 'Forbidden' });

    const endTime = new Date();
    session.endTime = endTime;

    // Server-authoritative duration: wall-clock time since startTime
    const wallClockSecs = Math.floor((endTime - session.startTime) / 1000);
    const clientSecs    = Number(req.body.duration) || 0;
    // Accept client hint but cap at wall-clock to prevent inflation from paused states
    session.duration = clientSecs > 0 ? Math.min(clientSecs, wallClockSecs) : wallClockSecs;

    await session.save();
    console.log(`[Timer] Session saved — id:${session._id} duration:${session.duration}s date:${session.date}`);

    // Broadcast updated daily total via Socket.io
    const io = req.app.get('io');
    if (io) emitStudySync(io, userId, session.date);

    res.status(200).json(session);
  } catch (err) {
    console.error('[updateSession]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/timer/today
const getTodaySessions = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tzOffset = Number(req.query.tz) || 0;
    const today    = getLocalDate(tzOffset);
    const sessions = await TimeSession.find({ userId, date: today });
    res.json(sessions);
  } catch (err) {
    console.error('[getTodaySessions]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/timer/stats?range=today|yesterday|7d|30d|6m|1y|2y  OR  ?startDate=&endDate=
const getStats = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tzOffset = Number(req.query.tz) || 0;
    const today    = getLocalDate(tzOffset);

    // ── Resolve date range ────────────────────────────────────────────────────
    let startDate, endDate;

    if (req.query.startDate && req.query.endDate) {
      startDate = req.query.startDate; // YYYY-MM-DD
      endDate   = req.query.endDate;
    } else {
      const todayMs  = new Date(today).getTime();
      endDate = today;

      const range = req.query.range || '7d';
      const DAY   = 86_400_000;

      const offsets = {
        today:     0,
        yesterday: 1,
        '7d':      6,
        '30d':     29,
        '6m':      182,
        '1y':      364,
        '2y':      729,
      };

      const daysBack = offsets[range] ?? 6;
      const startMs  = todayMs - daysBack * DAY;
      const s = new Date(startMs);
      startDate = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;

      // yesterday: endDate = yesterday
      if (range === 'yesterday') {
        const y = new Date(todayMs - DAY);
        endDate = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
        startDate = endDate;
      }
    }

    // ── MongoDB aggregation — group by date, sum duration ─────────────────────
    const dailyBreakdown = await TimeSession.aggregate([
      { $match: { userId, date: { $gte: startDate, $lte: endDate }, duration: { $gt: 0 } } },
      { $group: { _id: '$date', totalSeconds: { $sum: '$duration' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', totalSeconds: 1 } },
    ]);

    const periodTotal = dailyBreakdown.reduce((a, b) => a + b.totalSeconds, 0);

    // ── Convenience summaries ─────────────────────────────────────────────────
    const dayMap = Object.fromEntries(dailyBreakdown.map(d => [d.date, d.totalSeconds]));

    const todayTotal     = dayMap[today] ?? 0;
    const yestDate       = (() => { const d = new Date(new Date(today).getTime() - 86_400_000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    const yesterdayTotal = dayMap[yestDate] ?? 0;

    // Week / month / year — always computed fresh from DB for accuracy
    const [weekAgg, monthAgg, yearAgg] = await Promise.all([
      TimeSession.aggregate([
        { $match: { userId, date: { $gte: (() => { const d = new Date(Date.now() - 6*86_400_000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(), $lte: today }, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
      TimeSession.aggregate([
        { $match: { userId, date: { $gte: (() => { const d = new Date(Date.now() - 29*86_400_000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(), $lte: today }, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
      TimeSession.aggregate([
        { $match: { userId, date: { $gte: (() => { const d = new Date(Date.now() - 364*86_400_000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(), $lte: today }, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
    ]);

    res.json({
      startDate,
      endDate,
      periodTotal,
      dailyBreakdown,
      summary: {
        today:     todayTotal,
        yesterday: yesterdayTotal,
        week:      weekAgg[0]?.total  ?? 0,
        month:     monthAgg[0]?.total ?? 0,
        year:      yearAgg[0]?.total  ?? 0,
      },
    });
  } catch (err) {
    console.error('[getStats]', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { startSession, updateSession, getTodaySessions, getStats };
