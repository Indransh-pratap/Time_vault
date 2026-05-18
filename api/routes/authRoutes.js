const express = require('express');
const router = express.Router();
const { syncUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/sync-user', protect, syncUser);

module.exports = router;
