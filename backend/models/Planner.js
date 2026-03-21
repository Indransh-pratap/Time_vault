const mongoose = require('mongoose');

const PlannerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }]
}, { timestamps: true });

module.exports = mongoose.model('Planner', PlannerSchema);
