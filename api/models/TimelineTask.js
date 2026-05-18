const mongoose = require('mongoose');

const timelineTaskSchema = new mongoose.Schema({
  userId:    { type: String, required: true }, // Firebase UID string
  title:     { type: String, required: true },
  startTime: { type: String, required: true }, // HH:mm
  endTime:   { type: String, required: true }, // HH:mm
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('TimelineTask', timelineTaskSchema);
