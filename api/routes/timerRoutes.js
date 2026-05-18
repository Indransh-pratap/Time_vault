const express = require('express');
const router  = express.Router();
const { startSession, updateSession, getTodaySessions, getStats } = require('../controllers/timerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/session',    startSession);
router.put('/session/:id', updateSession);
router.get('/today',       getTodaySessions);
router.get('/stats',       getStats);

module.exports = router;
