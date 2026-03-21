const mongoose = require('mongoose');

const TargetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  goal: { type: String, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Target', TargetSchema);
