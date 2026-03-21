const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  firebaseUid: { type: String, required: true, unique: true },
  image: { type: String },
  provider: { type: String },
  subscription: {
    status: { type: String, enum: ['free', 'pro'], default: 'free' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
