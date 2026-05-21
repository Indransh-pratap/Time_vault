const express = require('express');
const router = express.Router();
const codingController = require('../controllers/codingController');
const { protect } = require('../middleware/auth');

// All coding routes are protected
router.use(protect);

router.get('/profile', codingController.getProfile);
router.put('/profile', codingController.updateProfile);
router.post('/sync', codingController.syncProfile);

router.get('/contests', codingController.getContests);

router.get('/goals', codingController.getGoals);
router.post('/goals', codingController.createGoal);
router.put('/goals/:id', codingController.updateGoal);
router.delete('/goals/:id', codingController.deleteGoal);

router.get('/sessions', codingController.getSessions);
router.post('/sessions', codingController.createSession);

router.get('/analytics', codingController.getAnalytics);

module.exports = router;
