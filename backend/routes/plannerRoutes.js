const express = require('express');
const router = express.Router();
const {
  getPlanner,
  createPlannerItem,
  updatePlannerItem,
  deletePlannerItem,
} = require('../controllers/plannerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPlanner)
  .post(createPlannerItem);

router.route('/:id')
  .put(updatePlannerItem)
  .delete(deletePlannerItem);

module.exports = router;
