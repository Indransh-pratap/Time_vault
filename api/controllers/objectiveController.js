const Objective = require('../models/Objective');

const getObjectives = async (req, res) => {
  console.log('Objectives GET hit — user:', req.user?.uid);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const objectives = await Objective.find({ userId });
    res.status(200).json(objectives);
  } catch (error) {
    console.error('getObjectives error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const createObjective = async (req, res) => {
  console.log('Objectives POST hit — user:', req.user?.uid, 'body:', req.body);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, targetValue } = req.body;
    if (!title || !targetValue) {
      return res.status(400).json({ message: 'title and targetValue are required' });
    }

    const newObj = new Objective({ userId, title, targetValue, currentValue: 0, progressPercent: 0 });
    const saved = await newObj.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('createObjective error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const addProgress = async (req, res) => {
  console.log('Objectives PUT hit — id:', req.params.id, 'body:', req.body);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const obj = await Objective.findById(req.params.id);
    if (!obj) return res.status(404).json({ message: 'Objective not found' });
    if (obj.userId !== userId) return res.status(401).json({ message: 'Not authorized' });

    const amount = req.body.amount ?? 1;
    obj.currentValue += amount;
    await obj.save(); // pre-save hook recalculates progressPercent

    res.status(200).json(obj);
  } catch (error) {
    console.error('addProgress error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getObjectives, createObjective, addProgress };
