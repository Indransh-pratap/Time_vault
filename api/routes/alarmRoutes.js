const express = require('express');
const router  = express.Router();
const { getAlarms, createAlarm, updateAlarm, deleteAlarm } = require('../controllers/alarmController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',     getAlarms);
router.post('/',    createAlarm);
router.put('/:id',  updateAlarm);
router.delete('/:id', deleteAlarm);

module.exports = router;
