// CSRF Token Middleware for Backend
// Uses session-based tokens for horizontal scalability

const crypto = require('crypto');

/**
 * Middleware to validate CSRF token
 * Apply this to all state-changing routes (POST, PUT, DELETE, PATCH)
 * Token is stored in the session (works with MongoDB session store → horizontally scalable)
 */
function validateCSRFToken(req, res, next) {
  // Skip CSRF for safe HTTP methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;

  // Skip CSRF for certain routes (auth, public forms)
  const skipRoutes = [
    '/api/auth/login',
    '/api/auth/google',
    '/api/auth/logout',
    '/api/auth/request-login-otp',
    '/api/auth/request-signup-otp',
    '/api/auth/request-reset-otp',
    '/api/auth/verify-login-otp',
    '/api/auth/verify-signup-otp',
    '/api/auth/verify-reset-otp',
    '/api/auth/refresh-token',
    '/api/contact',             // Public contact form
    '/api/notifications/subscribe', // Push subscription
  ];

  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // If no session exists at all, skip CSRF (unauthenticated requests)
  if (!req.session || !req.session.userId) {
    return next();
  }

  // Validate token against session
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_INVALID'
    });
  }

  next();
}

/**
 * Route handler to get/generate a CSRF token
 * The token is stored in the session so it persists across server restarts
 * and works with multiple server instances
 */
function getCSRFTokenRoute(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.json({
    success: true,
    csrfToken: req.session.csrfToken
  });
}

module.exports = {
  validateCSRFToken,
  getCSRFTokenRoute
};
