const mongoose = require('mongoose');

const platformStreakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, required: true },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  lastSolvedDate: { type: Date }
}, { timestamps: true });

platformStreakSchema.index({ userId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('PlatformStreak', platformStreakSchema);
