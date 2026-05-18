const TimelineTask = require('../models/TimelineTask');

const getTasks = async (req, res) => {
  console.log('Timeline GET hit — user:', req.user?.uid);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tasks = await TimelineTask.find({ userId }).sort({ startTime: 1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error('getTasks error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const createTask = async (req, res) => {
  console.log('Timeline POST hit — user:', req.user?.uid, 'body:', req.body);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title, startTime, endTime } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'title, startTime, and endTime are required' });
    }

    const newTask = new TimelineTask({ userId, title, startTime, endTime });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('createTask error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const toggleTask = async (req, res) => {
  console.log('Timeline PUT hit — id:', req.params.id);
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const task = await TimelineTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.userId !== userId) return res.status(401).json({ message: 'Not authorized' });

    task.completed = !task.completed;
    await task.save();
    res.status(200).json(task);
  } catch (error) {
    console.error('toggleTask error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTasks, createTask, toggleTask };
