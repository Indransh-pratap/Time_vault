import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  firebaseUid: { type: String, required: true, unique: true },
  image: { type: String },
  provider: { type: String },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String }, // YYYY-MM-DD
  subscription: {
    status: { type: String, enum: ['free', 'pro'], default: 'free' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
  }
}, { timestamps: true });

const User = models.User || model('User', UserSchema);

export default User;
