const mongoose = require('mongoose');

const AlarmSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },          // Firebase UID
    time: { type: String, required: true },            // "HH:MM" format
    label: { type: String, default: 'Wake up' },
    active: { type: Boolean, default: true },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alarm', AlarmSchema);
