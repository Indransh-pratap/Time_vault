const Task        = require('../models/Task');
const TimeSession = require('../models/TimeSession');
const DailyTime   = require('../models/DailyTime');

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.uid;

    // ── Task heatmap (Upgraded logic via DailyTime) ────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    const dayOffset = (n) => {
      const d = new Date(Date.now() - n * 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    const ninetyDaysAgo = dayOffset(90);
    const dailyMetrics = await DailyTime.find({
      userId,
      date: { $gte: ninetyDaysAgo, $lte: todayStr }
    });

    const heatmap = {};
    let totalTime = 0;
    let totalCompleted = 0;

    dailyMetrics.forEach(metric => {
      heatmap[metric.date] = {
        isActiveDay: metric.isActiveDay,
        totalStudyTime: metric.totalTime,
        completionRate: metric.completionRate,
        tasksCompleted: metric.tasksCompleted
      };
      totalTime += metric.totalTime;
      totalCompleted += metric.tasksCompleted;
    });

    const totalMissed = await Task.countDocuments({ userId, missed: true });

    // ── Study session stats (new) ───────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];

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
      totalCompleted:  totalCompleted,
      totalMissed:     totalMissed,
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
