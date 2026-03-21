const express = require('express');
const router = express.Router();
const { getTargets, createTarget, updateTarget, deleteTarget } = require('../controllers/targetController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getTargets)
  .post(createTarget)
  .put(updateTarget)
  .delete(deleteTarget);

module.exports = router;
