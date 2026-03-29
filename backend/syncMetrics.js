require('dotenv').config();
const mongoose = require('mongoose');
const TimeSession = require('./models/TimeSession');
const Task = require('./models/Task');
const DailyTime = require('./models/DailyTime');
const connectDB = require('./config/db');

async function migrate() {
  await connectDB();
  console.log('Connected. Starting migration...');

  try {
    // 1. Get all time sessions
    const sessions = await TimeSession.find({});
    for (const session of sessions) {
      if (!session.date || !session.userId) continue;
      await DailyTime.findOneAndUpdate(
        { userId: session.userId, date: session.date },
        {
          $inc: { totalTime: session.duration || 0 },
          $push: { sessions: { startTime: session.startTime, endTime: session.endTime, duration: session.duration } }
        },
        { new: true, upsert: true }
      );
    }
    console.log('Migrated sessions.');

    // 2. Get all Tasks
    const tasks = await Task.find({});
    for (const task of tasks) {
      if (!task.userId) continue;
      
      let dateStr = task.date;
      if (!dateStr && task.createdAt) {
        dateStr = new Date(task.createdAt).toISOString().split('T')[0];
        task.date = dateStr;
        await task.save();
      }
      if (!dateStr) continue;

      await DailyTime.findOneAndUpdate(
        { userId: task.userId, date: dateStr },
        {
          $inc: { totalTasks: 1, tasksCompleted: task.completed ? 1 : 0 }
        },
        { new: true, upsert: true }
      );
    }
    console.log('Migrated tasks.');

    // 3. Recalculate scores & active days
    const allDaily = await DailyTime.find({});
    for (const d of allDaily) {
      const compRate = d.totalTasks > 0 ? d.tasksCompleted / d.totalTasks : 0;
      d.completionRate = compRate;
      const normalized = Math.min(d.totalTime / 3600, 1);
      const score = (0.6 * compRate) + (0.4 * normalized);
      d.score = score;
      
      if (score > 0.7 || compRate >= 0.75 || d.totalTime >= 3600) {
        d.isActiveDay = true;
      } else {
        d.isActiveDay = false;
      }
      await d.save();
    }
    console.log('Recalculated ML scores and active status.');

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

migrate();
