const express = require('express');
const router = express.Router();
const { getTasks, createTask, toggleTask } = require('../controllers/timelineController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.put('/:id', toggleTask);

module.exports = router;
