const express = require('express');
const router = express.Router();
const { createCheckoutSession, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/checkout', protect, createCheckoutSession);

// Webhook route requires raw body
router.post('/webhook', handleWebhook);

module.exports = router;
