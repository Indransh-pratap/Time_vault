const mongoose = require('mongoose');

const PlannerItemSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  title:     { type: String, required: true },
  subject:   { type: String, default: 'General' },
  target:    { type: Number, required: true },
  progress:  { type: Number, default: 0 },
  type:      { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  date:      { type: Date,   required: true },         // timezone-adjusted date
  timezone:  { type: String, default: 'Asia/Kolkata' },
  completed: { type: Boolean, default: false },
  parentId:  { type: String, default: null, index: true }, // For Daily tasks pointing to Weekly goals
}, { timestamps: true });

// Compound index: queries by userId + date range are the hot path
PlannerItemSchema.index({ userId: 1, date: 1 });

// Computed virtual
PlannerItemSchema.virtual('progressPercent').get(function () {
  if (!this.target) return 0;
  return Math.min(Math.round((this.progress / this.target) * 100), 100);
});

PlannerItemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PlannerItem', PlannerItemSchema);
