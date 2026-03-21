const express = require('express');
const router = express.Router();
const { startSession, updateSession, getTodaySessions } = require('../controllers/timerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/session', startSession);
router.put('/session/:id', updateSession);
router.get('/today', getTodaySessions);

module.exports = router;
