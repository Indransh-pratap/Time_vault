const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platform: { type: String, required: true }, // LeetCode, Codeforces, CodeChef, AtCoder
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  link: { type: String, default: '' },
  difficulty: { type: String, default: 'Mixed' },
  externalId: { type: String, unique: true } // to avoid duplicates during sync
}, { timestamps: true });

module.exports = mongoose.model('Contest', contestSchema);
