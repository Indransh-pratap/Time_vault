const mongoose = require('mongoose');

const objectiveSchema = new mongoose.Schema({
  userId:          { type: String, required: true }, // Firebase UID string
  title:           { type: String, required: true },
  targetValue:     { type: Number, required: true },
  currentValue:    { type: Number, default: 0 },
  progressPercent: { type: Number, default: 0 }
}, { timestamps: true });

objectiveSchema.pre('save', function (next) {
  if (this.targetValue > 0) {
    this.progressPercent = Math.min(
      Math.round((this.currentValue / this.targetValue) * 100),
      100
    );
  } else {
    this.progressPercent = 0;
  }
  next();
});

module.exports = mongoose.model('Objective', objectiveSchema);
