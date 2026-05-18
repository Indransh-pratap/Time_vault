const express = require('express');
const router = express.Router();
const {
  getPlanner,
  createPlannerItem,
  updatePlannerItem,
  deletePlannerItem,
  getStrategy,
  updateStrategy,
} = require('../controllers/plannerController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPlanner)
  .post(createPlannerItem);

router.route('/strategy')
  .get(getStrategy)
  .put(updateStrategy);

router.route('/:id')
  .put(updatePlannerItem)
  .delete(deletePlannerItem);

module.exports = router;
