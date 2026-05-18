const express = require('express');
const router = express.Router();
const { getPlaylist, addToPlaylist, deleteFromPlaylist } = require('../controllers/playlistController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getPlaylist)
  .post(protect, addToPlaylist);

router.route('/:id')
  .delete(protect, deleteFromPlaylist);

module.exports = router;
