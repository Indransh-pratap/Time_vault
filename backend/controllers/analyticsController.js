const Task        = require('../models/Task');
const TimeSession = require('../models/TimeSession');

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.uid;

    // ── Task heatmap (existing logic, unchanged) ────────────────────────────
    const tasks = await Task.find({ userId });

    let totalTime = 0;
    const heatmap = {};

    tasks.forEach(task => {
      totalTime += task.timeSpent || 0;
      if (task.completed && task.createdAt) {
        const dateString = new Date(task.createdAt).toISOString().split('T')[0];
        heatmap[dateString] = (heatmap[dateString] || 0) + 1;
      }
    });

    // ── Study session stats (new) ───────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const dayOffset = (n) => {
      const d = new Date(Date.now() - n * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    const [todayAgg, weekAgg, monthAgg] = await Promise.all([
      TimeSession.aggregate([
        { $match: { userId, date: today, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
      TimeSession.aggregate([
        { $match: { userId, date: { $gte: dayOffset(6), $lte: today }, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
      TimeSession.aggregate([
        { $match: { userId, date: { $gte: dayOffset(29), $lte: today }, duration: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$duration' } } },
      ]),
    ]);

    res.json({
      totalTimeSpent:  totalTime,
      totalCompleted:  tasks.filter(t => t.completed).length,
      totalMissed:     tasks.filter(t => t.missed).length,
      heatmap,
      studyStats: {
        todaySeconds:  todayAgg[0]?.total  ?? 0,
        weekSeconds:   weekAgg[0]?.total   ?? 0,
        monthSeconds:  monthAgg[0]?.total  ?? 0,
      },
    });
  } catch (error) {
    console.error('[analyticsController]', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAnalytics };
