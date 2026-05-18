const mongoose = require('mongoose');

const dailySnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  leetcodeSolved: { type: Number, default: 0 },
  codeforcesSolved: { type: Number, default: 0 },
  codechefSolved: { type: Number, default: 0 },
  totalSolved: { type: Number, default: 0 }
}, { timestamps: true });

dailySnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailySnapshot', dailySnapshotSchema);
