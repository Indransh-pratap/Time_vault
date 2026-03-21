const Task = require('../models/Task');

const getAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.uid });
    
    let totalTime = 0;
    const heatmap = {};

    tasks.forEach(task => {
      totalTime += task.timeSpent || 0;

      if (task.completed && task.createdAt) {
        const dateString = new Date(task.createdAt).toISOString().split('T')[0];
        heatmap[dateString] = (heatmap[dateString] || 0) + 1;
      }
    });

    res.json({
      totalTimeSpent: totalTime,
      totalCompleted: tasks.filter(t => t.completed).length,
      totalMissed: tasks.filter(t => t.missed).length,
      heatmap
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAnalytics };
