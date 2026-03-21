const TimeSession = require('../models/TimeSession'); // single import

// @route   POST /api/timer/session
// @desc    Start a new timer session
// @access  Private
const startSession = async (req, res) => {
  console.log('Timer POST hit — user:', req.user?.uid);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const now = new Date();
    const date = now.toISOString().split('T')[0];

    const newSession = new TimeSession({ userId, startTime: now, date, type: 'manual', duration: 0 });
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (error) {
    console.error('startSession error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/timer/session/:id
// @desc    Pause or stop an active timer session
// @access  Private
const updateSession = async (req, res) => {
  console.log('Timer PUT hit — id:', req.params.id);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await TimeSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.userId !== userId) return res.status(401).json({ message: 'Not authorized' });

    const endTime = new Date();
    session.endTime = endTime;
    session.duration = Math.floor((endTime - session.startTime) / 1000); // seconds
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error('updateSession error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/timer/today
// @desc    Get all timer sessions for the current day
// @access  Private
const getTodaySessions = async (req, res) => {
  console.log('Timer GET today hit — user:', req.user?.uid);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const today = new Date().toISOString().split('T')[0];
    const sessions = await TimeSession.find({ userId, date: today });
    res.status(200).json(sessions);
  } catch (error) {
    console.error('getTodaySessions error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { startSession, updateSession, getTodaySessions };
