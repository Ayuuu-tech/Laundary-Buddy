// HTTPS Enforcement and Security Middleware

/**
 * Middleware to redirect HTTP to HTTPS in production
 * Should be placed early in middleware chain
 */
const httpsRedirect = (req, res, next) => {
  // Only enforce in production
  if (process.env.NODE_ENV === 'production') {
    // Check if the request is not secure
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

/**
 * Middleware to add strict HTTPS headers (HSTS)
 * Tells browsers to always use HTTPS
 */
const hstsMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // max-age: 1 year in seconds
    // includeSubDomains: apply to all subdomains
    // preload: submit to browser HSTS preload list
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
};

/**
 * Middleware to prevent clickjacking attacks
 */
const antiClickjackingMiddleware = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Middleware to prevent MIME type sniffing
 */
const noSniffMiddleware = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Middleware to control referrer information
 */
const referrerPolicyMiddleware = (req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Middleware to control browser features and APIs
 */
const permissionsPolicyMiddleware = (req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  next();
};

/**
 * Combined HTTPS and security middleware
 */
const httpsSecurityMiddleware = [
  httpsRedirect,
  hstsMiddleware,
  antiClickjackingMiddleware,
  noSniffMiddleware,
  referrerPolicyMiddleware,
  permissionsPolicyMiddleware
];

module.exports = {
  httpsRedirect,
  hstsMiddleware,
  antiClickjackingMiddleware,
  noSniffMiddleware,
  referrerPolicyMiddleware,
  permissionsPolicyMiddleware,
  httpsSecurityMiddleware
};
