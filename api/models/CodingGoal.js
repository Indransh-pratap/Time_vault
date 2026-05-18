const mongoose = require('mongoose');

const codingGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true }, // e.g., "Reach CF 1600"
  target: { type: String, default: '' }, // e.g., "500 DSA questions"
  deadline: { type: Date },
  dailyTarget: {
    leetcode: { type: Number, default: 0 },
    codeforces: { type: Number, default: 0 },
    codechef: { type: Number, default: 0 }
  },
  progress: { type: Number, default: 0 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'On Hold'], default: 'In Progress' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CodingGoal', codingGoalSchema);
