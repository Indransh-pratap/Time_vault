const Task = require('../models/Task');
const User = require('../models/User');
const DailyTime = require('../models/DailyTime');

function getYesterdayDateString(dateStr) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

const calculateAndUpdateStreak = async (userId, date, io = null) => {
  try {
    // 1. Fetch Tasks
    const tasks = await Task.find({ userId, date });
    const totalTasks = tasks.length;
    const tasksCompleted = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? tasksCompleted / totalTasks : 0;

    // 2. Fetch or Create DailyTime
    let dailyTime = await DailyTime.findOne({ userId, date });
    if (!dailyTime) {
      dailyTime = new DailyTime({ userId, date, totalTime: 0 });
    }

    dailyTime.totalTasks = totalTasks;
    dailyTime.tasksCompleted = tasksCompleted;
    dailyTime.completionRate = completionRate;

    // 3. Calculate Score
    const normalizedStudyTime = Math.min(dailyTime.totalTime / 3600, 1);
    const score = (0.6 * completionRate) + (0.4 * normalizedStudyTime);
    dailyTime.score = score;
    
    let isActiveDay = false;
    if (score > 0.7 || completionRate >= 0.75 || dailyTime.totalTime >= 3600) {
      isActiveDay = true;
    }
    
    dailyTime.isActiveDay = isActiveDay;
    await dailyTime.save();

    // 4. Update Streak in User
    const user = await User.findOne({ firebaseUid: userId });
    if (user) {
      if (isActiveDay) {
        const yesterday = getYesterdayDateString(date);
        
        if (user.lastActiveDate === yesterday) {
          if (user.lastActiveDate !== date) {
             user.currentStreak += 1;
          }
        } else if (user.lastActiveDate === date) {
          // Already active today
        } else {
          // Streak broke (missed yesterday)
          user.currentStreak = 1;
        }
        
        user.lastActiveDate = date;
        if (user.currentStreak > user.longestStreak) {
          user.longestStreak = user.currentStreak;
        }
      } else {
        // Not active, streak breaks
        if (user.lastActiveDate === date) {
          user.currentStreak = 0; 
        } else {
          user.currentStreak = 0;
        }
      }
      await user.save();
    }
    
    // 5. Emit socket update
    if (io) {
      io.emit('metrics:update', {
        date,
        isActiveDay,
        totalStudyTime: dailyTime.totalTime,
        tasksCompleted,
        totalTasks,
        completionRate
      });
    }

    console.log(`[Metrics] Updated userId:${userId} date:${date} active:${isActiveDay} score:${score.toFixed(2)} streak:${user?.currentStreak}`);
  } catch (error) {
    console.error('[calculateAndUpdateStreak] Error:', error.message);
  }
};

module.exports = { calculateAndUpdateStreak };
