const express = require('express');
const router  = express.Router();
const { getXP, awardTaskXP } = require('../controllers/xpController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',         getXP);
router.post('/award',   awardTaskXP);

module.exports = router;
