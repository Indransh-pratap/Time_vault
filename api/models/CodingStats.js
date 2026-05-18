const mongoose = require('mongoose');

const codingStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leetcode: {
    totalSolved: { type: Number, default: 0 },
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },
  codeforces: {
    rating: { type: Number, default: 0 },
    maxRating: { type: Number, default: 0 },
    rank: { type: String, default: 'unrated' },
    solvedCount: { type: Number, default: 0 }
  },
  codechef: {
    rating: { type: Number, default: 0 },
    stars: { type: String, default: '0' },
    solvedCount: { type: Number, default: 0 }
  },
  atcoder: {
    rating: { type: Number, default: 0 },
    rank: { type: String, default: '' }
  },
  github: {
    contributions: { type: Number, default: 0 },
    publicRepos: { type: Number, default: 0 }
  },
  lastFetched: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CodingStats', codingStatsSchema);
