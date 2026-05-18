const mongoose = require('mongoose');

const DailyTimeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  totalTime: { type: Number, default: 0 }, // in seconds
  tasksCompleted: { type: Number, default: 0 },
  totalTasks: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 },
  isActiveDay: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  sessions: [
    {
      startTime: { type: Date },
      endTime: { type: Date },
      duration: { type: Number }
    }
  ]
}, { timestamps: true });

DailyTimeSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyTime', DailyTimeSchema);
