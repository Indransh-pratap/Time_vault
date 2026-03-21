const express = require('express');
const router = express.Router();
const { getPlanner, updatePlanner } = require('../controllers/plannerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPlanner)
  .post(updatePlanner);

module.exports = router;
