const Target = require('../models/Target');

const getTargets = async (req, res) => {
  try {
    const targets = await Target.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTarget = async (req, res) => {
  try {
    const { type, goal } = req.body;
    const target = await Target.create({
      userId: req.user.uid,
      type,
      goal,
      progress: 0,
      completed: false
    });
    res.status(201).json(target);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTarget = async (req, res) => {
  try {
    const { id, type, goal, progress, completed } = req.body;
    const target = await Target.findOneAndUpdate(
      { _id: id, userId: req.user.uid },
      { type, goal, progress, completed },
      { new: true }
    );
    if (!target) return res.status(404).json({ error: 'Target not found' });
    res.json(target);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTarget = async (req, res) => {
  try {
    const { id } = req.query;
    const target = await Target.findOneAndDelete({ _id: id, userId: req.user.uid });
    if (!target) return res.status(404).json({ error: 'Target not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getTargets, createTarget, updateTarget, deleteTarget };
