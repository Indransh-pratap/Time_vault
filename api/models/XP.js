const mongoose = require('mongoose');

const XPSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, unique: true },
    totalXP:   { type: Number, default: 0 },
    dailyXP:   { type: Number, default: 0 },
    level:     { type: Number, default: 0 },
    dailyDate: { type: String, default: '' }, // "YYYY-MM-DD" — resets dailyXP each new day
    streak:    { type: Number, default: 0 },  // future use
  },
  { timestamps: true }
);

module.exports = mongoose.model('XP', XPSchema);
