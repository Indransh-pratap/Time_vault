const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  month: { type: String, required: true }, // e.g. "2026-04"
  goal: { type: String, default: "Set a primary goal for this month" },
  focusTags: { type: [String], default: [] },
  quote: { type: String, default: "Consistency > Motivation" }
}, { timestamps: true });

strategySchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyStrategy', strategySchema);
