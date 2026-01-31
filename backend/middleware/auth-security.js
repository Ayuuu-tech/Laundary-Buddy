// Authentication Security Enhancement Middleware

const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token (short-lived)
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // Extended for mobile app usage without refresh flow
  );
}

/**
 * Generate JWT refresh token (long-lived)
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify refresh token and generate new access token
 */
async function refreshAccessToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user and check if refresh token exists
    const User = require('../models/User');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if refresh token is in user's tokens list
    const tokenExists = user.refreshTokens.some(rt => {
      return rt.token === refreshToken && rt.expiresAt > Date.now();
    });

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    return res.json({
      success: true,
      token: newAccessToken,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
}

/**
 * Logout and revoke refresh token
 */
async function revokeRefreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (user && refreshToken) {
      await user.removeRefreshToken(refreshToken);
    }

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Revoke token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
}

/**
 * Middleware to check session timeout and idle time
 */
function sessionTimeoutMiddleware(req, res, next) {
  if (req.session && req.session.lastActivity) {
    const idleTimeout = 30 * 60 * 1000; // 30 minutes
    const timeSinceLastActivity = Date.now() - req.session.lastActivity;

    if (timeSinceLastActivity > idleTimeout) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Session expired due to inactivity',
        code: 'SESSION_TIMEOUT'
      });
    }
  }

  // Update last activity time
  if (req.session) {
    req.session.lastActivity = Date.now();
  }

  next();
}

/**
 * Middleware to log security events
 */
async function logSecurityEvent(userId, event, metadata = {}) {
  const SecurityLog = require('../models/SecurityLog');

  try {
    await SecurityLog.create({
      userId,
      event,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Check if user account is locked
 */
async function checkAccountLock(user) {
  if (user.isAccountLocked()) {
    const remainingTime = Math.ceil((user.accountLockedUntil - Date.now()) / 1000 / 60);
    return {
      locked: true,
      message: `Account is locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`
    };
  }
  return { locked: false };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  sessionTimeoutMiddleware,
  logSecurityEvent,
  checkAccountLock
};
