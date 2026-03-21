const Planner = require('../models/Planner');

const getPlanner = async (req, res) => {
  try {
    const { date, type } = req.query;
    let query = { userId: req.user.uid };

    if (date && type) {
      query.date = new Date(date);
      query.type = type;
      const planner = await Planner.findOne(query).populate('tasks');
      return res.json(planner || { tasks: [] });
    }

    const planners = await Planner.find(query).sort({ date: -1 }).populate('tasks');
    res.json(planners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePlanner = async (req, res) => {
  try {
    const { date, type, tasks } = req.body;
    const targetDate = new Date(date);

    let planner = await Planner.findOne({ userId: req.user.uid, date: targetDate, type });

    if (planner) {
      planner.tasks = tasks;
      await planner.save();
      return res.json(planner);
    }

    planner = await Planner.create({
      userId: req.user.uid,
      date: targetDate,
      type,
      tasks
    });
    res.status(201).json(planner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPlanner, updatePlanner };
