const PlannerItem = require('../models/Planner');

// ── Utility: 2 AM reset logic ─────────────────────────────────
// If it's before 2 AM, treat this as still being the previous day
const getAdjustedDate = (isoString, timezone = 'Asia/Kolkata') => {
  const d = isoString ? new Date(isoString) : new Date();
  // Get local hour in the given timezone
  const localHour = parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(d),
    10
  );
  // Before 2 AM → treat as yesterday
  if (localHour < 2) {
    d.setDate(d.getDate() - 1);
  }
  // Normalize to midnight UTC
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d); // YYYY-MM-DD
  return new Date(ymd + 'T00:00:00.000Z');
};

// GET /api/planner?week=2026-03-22  OR  /api/planner?type=weekly
const getPlanner = async (req, res) => {
  console.log('[Planner] GET — user:', req.user?.uid, 'query:', req.query);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const query = { userId };

    if (req.query.week) {
      // Return all tasks for the 7-day week containing the given date
      const weekStart = new Date(req.query.week + 'T00:00:00.000Z');
      const weekEnd   = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      query.date = { $gte: weekStart, $lt: weekEnd };
    } else if (req.query.month) {
      // Return all tasks for a calendar month, e.g. ?month=2026-03
      const [year, month] = req.query.month.split('-').map(Number);
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd   = new Date(Date.UTC(year, month, 1)); // exclusive
      query.date = { $gte: monthStart, $lt: monthEnd };
    } else if (req.query.date) {
      query.date = getAdjustedDate(req.query.date, req.query.timezone);
    } else if (req.query.type) {
      query.type = req.query.type;
    }

    const items = await PlannerItem.find(query).sort({ date: 1, createdAt: 1 });
    res.json(items);
  } catch (error) {
    console.error('[Planner] getPlanner error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/planner
const createPlannerItem = async (req, res) => {
  console.log('[Planner] POST — user:', req.user?.uid, 'body:', req.body);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, subject, target, type, date, timezone } = req.body;
    if (!title || !target) {
      return res.status(400).json({ message: 'title and target are required' });
    }

    const tz = timezone || 'Asia/Kolkata';
    const adjustedDate = getAdjustedDate(date, tz);

    const item = new PlannerItem({
      userId, title,
      subject: subject || 'General',
      target:  Number(target),
      progress: 0,
      type: type || 'daily',
      date: adjustedDate,
      timezone: tz,
      completed: false,
    });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('[Planner] createPlannerItem error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/planner/:id
const updatePlannerItem = async (req, res) => {
  console.log('[Planner] PUT — id:', req.params.id);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const item = await PlannerItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.userId !== userId) return res.status(401).json({ message: 'Not authorized' });

    const { title, subject, target, progress, completed, type } = req.body;
    if (title     !== undefined) item.title     = title;
    if (subject   !== undefined) item.subject   = subject;
    if (target    !== undefined) item.target    = Number(target);
    if (progress  !== undefined) item.progress  = Number(progress);
    if (completed !== undefined) item.completed = Boolean(completed);
    if (type      !== undefined) item.type      = type;

    await item.save();

    // Real-time broadcast via Socket.io
    const io = req.app.get('io');
    if (io) io.emit('planner:sync', item.toJSON());

    res.json(item);
  } catch (error) {
    console.error('[Planner] updatePlannerItem error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/planner/:id
const deletePlannerItem = async (req, res) => {
  console.log('[Planner] DELETE — id:', req.params.id);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const item = await PlannerItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.userId !== userId) return res.status(401).json({ message: 'Not authorized' });

    await item.deleteOne();
    res.json({ message: 'Deleted', _id: req.params.id });
  } catch (error) {
    console.error('[Planner] deletePlannerItem error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlanner, createPlannerItem, updatePlannerItem, deletePlannerItem };
