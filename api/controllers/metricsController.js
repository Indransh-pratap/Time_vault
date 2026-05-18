const DailyTime = require('../models/DailyTime');

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays); 
  return d.toISOString().split('T')[0];
};

const getMetricsToday = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = getLocalDateString(0);
    
    const result = await DailyTime.aggregate([
      { $match: { userId, date: today } },
      { $group: { _id: '$date', totalTime: { $sum: '$totalTime' } } }
    ]);
    
    res.json({ date: today, totalTime: result[0]?.totalTime || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMetricsWeek = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = getLocalDateString(0);
    const startOfWeek = getLocalDateString(-6); // Last 7 days
    
    const result = await DailyTime.aggregate([
      { $match: { userId, date: { $gte: startOfWeek, $lte: today } } },
      { $group: { _id: null, totalTime: { $sum: '$totalTime' } } }
    ]);
    
    res.json({ range: 'week', start: startOfWeek, end: today, totalTime: result[0]?.totalTime || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMetricsMonth = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = getLocalDateString(0);
    const startOfMonth = getLocalDateString(-29); // Last 30 days
    
    const result = await DailyTime.aggregate([
      { $match: { userId, date: { $gte: startOfMonth, $lte: today } } },
      { $group: { _id: null, totalTime: { $sum: '$totalTime' } } }
    ]);
    
    res.json({ range: 'month', start: startOfMonth, end: today, totalTime: result[0]?.totalTime || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMetricsToday, getMetricsWeek, getMetricsMonth };
