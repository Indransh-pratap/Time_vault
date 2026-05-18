const mongoose = require('mongoose');

const codingProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  leetcodeUsername: { type: String, default: '' },
  codeforcesHandle: { type: String, default: '' },
  codechefUsername: { type: String, default: '' },
  atcoderHandle: { type: String, default: '' },
  githubUsername: { type: String, default: '' },
  totalSolved: { type: Number, default: 0 },
  combinedStreak: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  syncStatus: { type: String, enum: ['idle', 'syncing', 'error'], default: 'idle' }
}, { timestamps: true });

module.exports = mongoose.model('CodingProfile', codingProfileSchema);
