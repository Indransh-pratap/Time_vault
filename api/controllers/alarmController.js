const Alarm = require('../models/Alarm');

// GET /api/alarm — fetch all alarms for the authenticated user
const getAlarms = async (req, res) => {
  try {
    const alarms = await Alarm.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    res.json(alarms);
  } catch (err) {
    console.error('[alarmController] getAlarms:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/alarm — create a new alarm
const createAlarm = async (req, res) => {
  try {
    const { time, label, active, timezone } = req.body;

    if (!time) {
      return res.status(400).json({ message: 'Alarm time is required' });
    }

    const alarm = await Alarm.create({
      userId: req.user.uid,
      time,
      label: label || 'Wake up',
      active: active !== undefined ? active : true,
      timezone: timezone || 'UTC',
    });

    // Real-time broadcast
    const io = req.app.get('io');
    io.emit('alarm:sync', { action: 'created', alarm });

    res.status(201).json(alarm);
  } catch (err) {
    console.error('[alarmController] createAlarm:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/alarm/:id — toggle or update alarm
const updateAlarm = async (req, res) => {
  try {
    const alarm = await Alarm.findOne({ _id: req.params.id, userId: req.user.uid });

    if (!alarm) {
      return res.status(404).json({ message: 'Alarm not found' });
    }

    const { time, label, active, timezone } = req.body;

    if (time !== undefined)     alarm.time     = time;
    if (label !== undefined)    alarm.label    = label;
    if (active !== undefined)   alarm.active   = active;
    if (timezone !== undefined) alarm.timezone = timezone;

    await alarm.save();

    // Real-time broadcast
    const io = req.app.get('io');
    io.emit('alarm:sync', { action: 'updated', alarm });

    res.json(alarm);
  } catch (err) {
    console.error('[alarmController] updateAlarm:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/alarm/:id — delete an alarm
const deleteAlarm = async (req, res) => {
  try {
    const alarm = await Alarm.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });

    if (!alarm) {
      return res.status(404).json({ message: 'Alarm not found' });
    }

    // Real-time broadcast
    const io = req.app.get('io');
    io.emit('alarm:sync', { action: 'deleted', alarmId: req.params.id });

    res.json({ message: 'Alarm deleted' });
  } catch (err) {
    console.error('[alarmController] deleteAlarm:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAlarms, createAlarm, updateAlarm, deleteAlarm };
