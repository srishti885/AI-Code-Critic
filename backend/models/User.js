const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Subscription Details
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  validity: { type: Date, default: null }, // Pro kab khatam hoga
  
  // Daily Usage Tracking
  usageCount: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);