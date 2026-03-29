const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  author: {
    type: String
  },
  thumbnail: {
    type: String
  },
  type: {
    type: String,
    enum: ['youtube', 'local'],
    default: 'youtube'
  }
}, { timestamps: true });

// Ensure user can't add same video multiple times
playlistSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('Playlist', playlistSchema);
