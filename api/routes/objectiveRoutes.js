const express = require('express');
const router = express.Router();
const { getObjectives, createObjective, addProgress } = require('../controllers/objectiveController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getObjectives)
  .post(createObjective);

router.put('/:id/progress', addProgress);

module.exports = router;
