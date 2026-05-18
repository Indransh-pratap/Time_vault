const mongoose = require('mongoose');

const contestReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  notifyAt: { type: Date, required: true },
  type: { type: String, enum: ['1h', '15m'], required: true },
  sent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ContestReminder', contestReminderSchema);
