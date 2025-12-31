    signupOTP: { type: String },
    signupOTPExpiry: { type: Date },
  loginOTP: { type: String },
  loginOTPExpiry: { type: Date },
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  googleId: { type: String, default: null },
  profilePhoto: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  resetOTP: { type: String, default: null }, // OTP for password reset
  resetOTPExpiry: { type: Date, default: null } // OTP expiry time
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
