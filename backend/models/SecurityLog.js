const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  event: { 
    type: String, 
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGIN_LOCKED',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS',
      'PASSWORD_CHANGED',
      'ACCOUNT_CREATED',
      'SUSPICIOUS_ACTIVITY',
      'TOKEN_REFRESH',
      'LOGOUT'
    ]
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Index for querying logs
securityLogSchema.index({ userId: 1, timestamp: -1 });
securityLogSchema.index({ event: 1, timestamp: -1 });

// TTL index - automatically delete logs older than 90 days
securityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
