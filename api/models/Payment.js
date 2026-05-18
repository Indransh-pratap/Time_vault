const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  stripeSubscriptionId: String,
  amount: Number,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
