const express = require('express');
const router = express.Router();
const { getMetricsToday, getMetricsWeek, getMetricsMonth } = require('../controllers/metricsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/today', getMetricsToday);
router.get('/week', getMetricsWeek);
router.get('/month', getMetricsMonth);

module.exports = router;
