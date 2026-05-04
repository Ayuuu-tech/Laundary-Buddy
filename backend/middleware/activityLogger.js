/**
 * ============================================================================
 * LAUNDRY BUDDY - Smart Laundry Management System
 * ============================================================================
 *
 * @project   Laundry Buddy
 * @author    Ayush
 * @status    Production Ready
 * @description Part of the Laundry Buddy Evaluation Project.
 *              Handles core application logic, API routing, and database integrations.
 * ============================================================================
 */

/**
 * Activity Logger Middleware
 * Automatically logs every API request to the activity_logs table in Supabase.
 * Captures: user info, HTTP method, route, status code, response time, IP, etc.
 */

const { getActivityLogModel } = require('../models/ActivityLog');

// Map routes to human-readable descriptions and categories
const ROUTE_DESCRIPTIONS = {
  // Auth routes
  'POST /api/auth/register': { desc: 'User registered a new account', cat: 'auth' },
  'POST /api/auth/login': { desc: 'User logged in', cat: 'auth' },
  'POST /api/auth/logout': { desc: 'User logged out', cat: 'auth' },
  'POST /api/auth/request-signup-otp': { desc: 'Requested signup OTP', cat: 'auth' },
  'POST /api/auth/verify-signup-otp': { desc: 'Verified signup OTP', cat: 'auth' },
  'POST /api/auth/request-login-otp': { desc: 'Requested login OTP', cat: 'auth' },
  'POST /api/auth/verify-login-otp': { desc: 'Verified login OTP', cat: 'auth' },
  'POST /api/auth/request-password-reset-otp': { desc: 'Requested password reset OTP', cat: 'auth' },
  'POST /api/auth/verify-otp-reset-password': { desc: 'Reset password via OTP', cat: 'auth' },
  'POST /api/auth/refresh-token': { desc: 'Refreshed access token', cat: 'auth' },
  'POST /api/auth/revoke-token': { desc: 'Revoked refresh token', cat: 'auth' },
  'GET /api/auth/me': { desc: 'Fetched current user profile', cat: 'auth' },
  'PUT /api/auth/profile': { desc: 'Updated user profile', cat: 'profile' },
  'POST /api/auth/change-password': { desc: 'Changed account password', cat: 'auth' },
  'POST /api/auth/upload-photo': { desc: 'Uploaded profile photo', cat: 'profile' },

  // Google Auth
  'POST /api/auth/google': { desc: 'Logged in via Google OAuth', cat: 'auth' },

  // Order routes
  'POST /api/orders': { desc: 'Created new laundry order', cat: 'order' },
  'GET /api/orders': { desc: 'Viewed order list', cat: 'order' },
  'GET /api/orders/history': { desc: 'Viewed order history', cat: 'order' },

  // Tracking routes
  'GET /api/tracking': { desc: 'Viewed order tracking', cat: 'tracking' },

  // Admin routes
  'GET /api/admin/stats': { desc: 'Viewed admin statistics', cat: 'admin' },
  'GET /api/admin/users': { desc: 'Viewed all users', cat: 'admin' },
  'GET /api/admin/orders': { desc: 'Viewed all orders (admin)', cat: 'admin' },
  'GET /api/admin/sessions': { desc: 'Viewed active sessions', cat: 'admin' },
  'GET /api/admin/logs': { desc: 'Viewed activity logs', cat: 'admin' },

  // Support routes
  'POST /api/support': { desc: 'Submitted support ticket', cat: 'support' },
  'GET /api/support': { desc: 'Viewed support tickets', cat: 'support' },

  // Contact routes
  'POST /api/contact': { desc: 'Sent contact message', cat: 'contact' },
  'GET /api/contact': { desc: 'Viewed contact messages', cat: 'contact' },

  // Notification routes
  'POST /api/notifications/subscribe': { desc: 'Subscribed to push notifications', cat: 'notification' },

  // User routes
  'GET /api/users/me': { desc: 'Fetched user profile', cat: 'profile' },
  'DELETE /api/users/me': { desc: 'Requested account deletion', cat: 'profile' },
  'GET /api/users/export': { desc: 'Exported user data', cat: 'profile' },

  // CSRF
  'GET /api/csrf-token': { desc: 'Fetched CSRF token', cat: 'system' },

  // Health
  'GET /api/health': { desc: 'Health check', cat: 'system' }
};

/**
 * Get a clean route key by normalizing dynamic segments
 */
function normalizeRoute(method, path) {
  // Remove query parameters
  const cleanPath = path.split('?')[0];

  // Replace dynamic IDs with :id for matching
  const normalized = cleanPath
    .replace(/\/\d+/g, '/:id')           // numeric IDs
    .replace(/\/[a-f0-9]{24,}/g, '/:id') // MongoDB-style IDs
    .replace(/\/LB-[A-Z0-9-]+/g, '/:id') // Order numbers like LB-20251025-1234
    .replace(/\/$/, '');                  // trailing slash

  return `${method} ${normalized}`;
}

/**
 * Get description and category for a route
 */
function getRouteInfo(method, path) {
  const key = normalizeRoute(method, path);

  // Direct match
  if (ROUTE_DESCRIPTIONS[key]) {
    return ROUTE_DESCRIPTIONS[key];
  }

  // Partial match (for routes with dynamic params)
  for (const [pattern, info] of Object.entries(ROUTE_DESCRIPTIONS)) {
    if (key.startsWith(pattern.replace('/:id', ''))) {
      return info;
    }
  }

  // Fallback based on method and path prefix
  const pathParts = path.split('/').filter(Boolean);
  const category = pathParts[1] || 'general'; // e.g., 'auth', 'orders', 'admin'

  const methodDescriptions = {
    GET: 'Viewed',
    POST: 'Created/Submitted',
    PUT: 'Updated',
    PATCH: 'Modified',
    DELETE: 'Deleted'
  };

  return {
    desc: `${methodDescriptions[method] || method} ${path}`,
    cat: category
  };
}

/**
 * Sanitize request body — remove sensitive fields
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'otp', 'token', 'refreshToken', 'accessToken'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Limit body size for storage
  const json = JSON.stringify(sanitized);
  if (json.length > 2000) {
    return { _truncated: true, keys: Object.keys(sanitized) };
  }

  return sanitized;
}

/**
 * Determine severity based on status code
 */
function getSeverity(statusCode) {
  if (statusCode >= 500) {
    return 'critical';
  }
  if (statusCode >= 400) {
    return 'warning';
  }
  if (statusCode >= 300) {
    return 'info';
  }
  return 'info';
}

const SKIP_ROUTES = [
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/service-worker.js',
  '/sitemap.xml',
  '/api/admin/logs',   // Ignore log polling
  '/api/admin/stats'   // Ignore stats polling
];

/**
 * Activity Logger Middleware
 */
function activityLoggerMiddleware(req, res, next) {
  // Only log API routes and important page loads
  if (!req.originalUrl.startsWith('/api/')) {
    return next();
  }

  // Skip noisy routes
  if (SKIP_ROUTES.some(r => req.originalUrl.startsWith(r))) {
    return next();
  }

  // Skip CSRF token and health checks in production (too noisy)
  if (req.originalUrl === '/api/csrf-token' || req.originalUrl === '/api/health') {
    return next();
  }

  const startTime = Date.now();

  // Capture the response finish event
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      const routeInfo = getRouteInfo(req.method, req.originalUrl);

      // Get user info from session or JWT
      let userId = null;
      let userName = null;
      let userEmail = null;

      if (req.session && req.session.user) {
        userId = req.session.user.id;
        userName = req.session.user.name;
        userEmail = req.session.user.email;
      } else if (req.user) {
        userId = req.user.id;
        userName = req.user.name;
        userEmail = req.user.email;
      }

      // For login/register, extract email from request body
      if (!userEmail && req.body && req.body.email) {
        userEmail = req.body.email;
      }

      const ActivityLog = getActivityLogModel();

      await ActivityLog.create({
        userId,
        userName,
        userEmail,
        action: req.method,
        route: req.originalUrl.substring(0, 500),
        statusCode: res.statusCode,
        responseTime,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        requestBody: sanitizeBody(req.body),
        description: routeInfo.desc,
        category: routeInfo.cat,
        severity: getSeverity(res.statusCode)
      });
    } catch (error) {
      // Don't crash the server if logging fails
      console.error('Activity logging error:', error.message);
    }
  });

  next();
}

module.exports = { activityLoggerMiddleware };
