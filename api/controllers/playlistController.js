const Playlist = require('../models/Playlist');

// @desc    Get user's playlist
// @route   GET /api/playlist
// @access  Private
exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add track to playlist
// @route   POST /api/playlist
// @access  Private
exports.addToPlaylist = async (req, res) => {
  try {
    const { videoId, title, author, thumbnail, type } = req.body;

    if (!videoId || !title) {
       return res.status(400).json({ message: "Missing required fields: videoId and title" });
    }

    // Handled by protect middleware: req.user is now a full Mongoose document
    const userId = req.user._id;

    // Check if already exists for this user to avoid unique index violation
    const existing = await Playlist.findOne({ userId, videoId });
    if (existing) {
      return res.status(400).json({ message: 'Track already in playlist' });
    }

    const track = await Playlist.create({
      userId,
      videoId,
      title,
      author,
      thumbnail,
      type
    });

    res.status(201).json(track);
  } catch (error) {
    console.error("[Playlist Engine] POST ERROR:", error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Remove track from playlist
// @route   DELETE /api/playlist/:id
// @access  Private
exports.deleteFromPlaylist = async (req, res) => {
  try {
    const track = await Playlist.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    res.json({ message: 'Track removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};
