const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline: Date,
  date: { type: String, index: true }, // YYYY-MM-DD format for daily tracking
  timeSpent: { type: Number, default: 0 },
  missed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
