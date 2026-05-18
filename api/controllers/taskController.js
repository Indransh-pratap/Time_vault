const Task = require('../models/Task');

const getTasks = async (req, res) => {
  try {
    const { date } = req.query;
    const query = { userId: req.user.uid };
    
    if (date) {
      query.date = date;
    } else {
      query.date = new Date().toISOString().split('T')[0];
    }
    
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, priority, deadline, date } = req.body;
    
    // Default to today if date isn't provided (fallback)
    const taskDate = date || new Date().toISOString().split('T')[0];
    
    const task = await Task.create({
      userId: req.user.uid,
      title,
      description,
      priority,
      deadline,
      date: taskDate,
    });

    if (task.date) {
      const io = req.app.get('io');
      const { calculateAndUpdateStreak } = require('../services/streakService');
      await calculateAndUpdateStreak(req.user.uid, task.date, io);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.body.id, userId: req.user.uid },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.date) {
      const io = req.app.get('io');
      const { calculateAndUpdateStreak } = require('../services/streakService');
      await calculateAndUpdateStreak(req.user.uid, task.date, io);
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.body.id, userId: req.user.uid });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.date) {
      const io = req.app.get('io');
      const { calculateAndUpdateStreak } = require('../services/streakService');
      await calculateAndUpdateStreak(req.user.uid, task.date, io);
    }

    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
