const mongoose = require('mongoose');

const timeSessionSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true }, // Firebase UID string
    startTime: { type: Date, default: Date.now },
    endTime:   { type: Date },                  // set on pause/stop
    duration:  { type: Number, default: 0 },    // seconds
    type:      { type: String, default: 'manual' },
    date:      { type: String },                // YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimeSession', timeSessionSchema);
