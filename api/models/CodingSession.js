const mongoose = require('mongoose');

const codingSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  platform: { type: String, required: true },
  link: { type: String, default: '' },
  tags: [String],
  difficulty: { type: String, default: '' },
  status: { type: String, enum: ['Attempting', 'Solved', 'Partially Solved', 'Gave Up'], default: 'Attempting' },
  notes: { type: String, default: '' },
  timeSpent: { type: Number, default: 0 }, // in seconds
  revisionDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('CodingSession', codingSessionSchema);
