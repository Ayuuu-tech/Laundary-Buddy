// CSRF Token Middleware for Backend
// Add this to backend/middleware/csrf.js

const crypto = require('crypto');

/**
 * Simple CSRF token generation and validation
 * For production, consider using a library like 'csurf'
 */
class CSRFProtection {
  constructor() {
    this.tokens = new Map();
    // Clean up old tokens every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.tokens.set(token, expiry);
    return token;
  }

  validateToken(token) {
    if (!token) return false;

    const expiry = this.tokens.get(token);
    if (!expiry) return false;

    if (Date.now() > expiry) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [token, expiry] of this.tokens.entries()) {
      if (now > expiry) {
        this.tokens.delete(token);
      }
    }
  }
}

const csrfProtection = new CSRFProtection();

/**
 * Middleware to generate CSRF token
 */
function generateCSRFToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = csrfProtection.generateToken();
  }
  next();
}

/**
 * Middleware to validate CSRF token
 * Apply this to all state-changing routes (POST, PUT, DELETE, PATCH)
 */
function validateCSRFToken(req, res, next) {
  // Skip CSRF for safe HTTP methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;

  // Skip CSRF for certain routes (customize as needed)
  const skipRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/logout',         // Must work even without valid token
    '/api/auth/request-login-otp',
    '/api/auth/request-signup-otp',
    '/api/auth/request-reset-otp',
    '/api/auth/verify-login-otp',
    '/api/auth/verify-signup-otp',
    '/api/auth/verify-reset-otp',
    '/api/auth/profile',        // Protected by session auth
    '/api/auth/change-password', // Protected by session auth
  ];

  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Validate token
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_INVALID'
    });
  }

  if (!csrfProtection.validateToken(token)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token expired',
      code: 'CSRF_EXPIRED'
    });
  }

  next();
}

/**
 * Route to get CSRF token
 */
function getCSRFTokenRoute(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = csrfProtection.generateToken();
  }

  res.json({
    success: true,
    csrfToken: req.session.csrfToken
  });
}

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  getCSRFTokenRoute
};
