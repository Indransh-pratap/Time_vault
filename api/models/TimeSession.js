const mongoose = require('mongoose');

const timeSessionSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime:   { type: Date },
    duration:  { type: Number, default: 0 },   // seconds – authoritative value
    type:      { type: String, default: 'manual' },
    date:      { type: String, index: true },  // YYYY-MM-DD (user's local date, 2 AM rollover)
  },
  { timestamps: true }
);

// Compound index for fast per-user date-range queries (supports 2+ years)
timeSessionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('TimeSession', timeSessionSchema);
