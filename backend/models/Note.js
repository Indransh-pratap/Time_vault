const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    title:   { type: String, default: 'Untitled' },
    content: { type: String, default: '' },
    type:    { type: String, enum: ['text', 'youtube'], default: 'text' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', NoteSchema);
