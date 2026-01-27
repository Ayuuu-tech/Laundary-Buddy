
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
  resetOTPExpiry: { type: Date, default: null }, // OTP expiry time
  signupOTP: { type: String, default: null },
  signupOTPExpiry: { type: Date, default: null },
  loginOTP: { type: String, default: null },
  loginOTPExpiry: { type: Date, default: null },
  
  // Account security fields
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  lastLoginIP: { type: String, default: null },
  passwordChangedAt: { type: Date, default: null },
  
  // Refresh token for JWT rotation
  refreshTokens: [{ 
    token: String, 
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date 
  }]
}, { timestamps: true });

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

// Method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 15 * 60 * 1000; // 15 minutes
  
  this.failedLoginAttempts += 1;
  
  if (this.failedLoginAttempts >= maxAttempts) {
    this.accountLockedUntil = new Date(Date.now() + lockoutDuration);
  }
  
  return this.save();
};

// Method to reset failed login attempts
userSchema.methods.resetLoginAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  return this.save();
};

// Method to add refresh token
userSchema.methods.addRefreshToken = async function(token) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  this.refreshTokens.push({ token, expiresAt });
  
  // Keep only last 5 tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
