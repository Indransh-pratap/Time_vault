const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema(
  {
    userId:       { type: String, required: true },
    title:        { type: String, default: 'Untitled' },
    content:      { type: String, default: '' },
    type:         { type: String, enum: ['text', 'youtube', 'pdf'], default: 'text' },
    fileUrl:      { type: String, default: '' },
    fileName:     { type: String, default: '' },
    fileSize:     { type: Number, default: 0 },        // bytes
    cloudinaryId: { type: String, default: '' },        // for deletion
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', NoteSchema);
