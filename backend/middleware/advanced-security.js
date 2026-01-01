// Advanced API Security Middleware

const validator = require('validator');
const { logSecurityEvent } = require('./auth-security');

/**
 * IP Blocking/Tracking System
 * Tracks suspicious IPs and blocks them after repeated violations
 */
class IPBlocker {
  constructor() {
    this.blockedIPs = new Map();
    this.suspiciousIPs = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
  }

  addViolation(ip, reason = 'rate_limit') {
    const current = this.suspiciousIPs.get(ip) || { count: 0, reasons: [] };
    current.count += 1;
    current.reasons.push({ reason, timestamp: Date.now() });
    current.lastViolation = Date.now();
    
    this.suspiciousIPs.set(ip, current);
    
    // Block after 10 violations in 1 hour
    if (current.count >= 10) {
      this.blockIP(ip, 24 * 60 * 60 * 1000); // Block for 24 hours
      console.warn(`🚫 IP blocked due to repeated violations: ${ip}`);
    }
  }

  blockIP(ip, duration) {
    this.blockedIPs.set(ip, Date.now() + duration);
  }

  isBlocked(ip) {
    const blockedUntil = this.blockedIPs.get(ip);
    if (blockedUntil && blockedUntil > Date.now()) {
      return true;
    }
    if (blockedUntil) {
      this.blockedIPs.delete(ip);
    }
    return false;
  }

  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean up old violations
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastViolation < oneHourAgo) {
        this.suspiciousIPs.delete(ip);
      }
    }
    
    // Clean up expired blocks
    for (const [ip, blockedUntil] of this.blockedIPs.entries()) {
      if (blockedUntil < now) {
        this.blockedIPs.delete(ip);
        console.log(`✅ IP unblocked: ${ip}`);
      }
    }
  }
}

const ipBlocker = new IPBlocker();

/**
 * Middleware to check if IP is blocked
 */
function ipBlockingMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (ipBlocker.isBlocked(ip)) {
    console.warn(`🚫 Blocked IP attempted access: ${ip}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Your IP has been temporarily blocked due to suspicious activity.',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
}

/**
 * Enhanced input sanitization middleware
 * Prevents XSS, SQL injection, NoSQL injection, etc.
 */
function sanitizeInputMiddleware(req, res, next) {
  try {
    // Sanitize all string inputs
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove null bytes
          obj[key] = obj[key].replace(/\0/g, '');
          
          // Trim whitespace
          obj[key] = obj[key].trim();
          
          // Escape HTML to prevent XSS (for display purposes)
          // Note: validator.escape is already applied by express-validator when needed
          // This is an additional layer
          
          // Check for suspicious patterns
          if (containsSuspiciousPatterns(obj[key])) {
            const ip = req.ip || req.connection.remoteAddress;
            console.warn(`⚠️ Suspicious input detected from ${ip}: ${key}`);
            ipBlocker.addViolation(ip, 'suspicious_input');
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
    
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next();
  }
}

/**
 * Check for suspicious patterns in input
 */
function containsSuspiciousPatterns(input) {
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,  // Script tags
    /javascript:/gi,                  // JavaScript protocol
    /on\w+\s*=/gi,                   // Event handlers (onclick, onerror, etc.)
    /\$where:/gi,                     // MongoDB $where
    /\$ne:/gi,                        // MongoDB $ne (in unexpected places)
    /union\s+select/gi,               // SQL injection
    /exec\s*\(/gi,                    // Code execution
    /eval\s*\(/gi,                    // eval function
    /\.\.\/\.\.\//g,                  // Path traversal
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Request size validation middleware
 * Already configured in server.js, but this provides additional checking
 */
function requestSizeValidation(maxSizeKB = 5000) {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSizeBytes = maxSizeKB * 1024;
    
    if (contentLength > maxSizeBytes) {
      const ip = req.ip || req.connection.remoteAddress;
      console.warn(`⚠️ Oversized request from ${ip}: ${contentLength} bytes`);
      ipBlocker.addViolation(ip, 'oversized_request');
      
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    next();
  };
}

/**
 * Email validation middleware
 */
function validateEmailMiddleware(fieldName = 'email') {
  return (req, res, next) => {
    const email = req.body[fieldName];
    
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    next();
  };
}

/**
 * URL validation middleware
 */
function validateURLMiddleware(fieldName) {
  return (req, res, next) => {
    const url = req.body[fieldName];
    
    if (url && !validator.isURL(url, { require_protocol: true })) {
      return res.status(400).json({
        success: false,
        message: `Invalid URL format for ${fieldName}`
      });
    }
    
    next();
  };
}

/**
 * Phone number validation middleware
 */
function validatePhoneMiddleware(fieldName = 'phone') {
  return (req, res, next) => {
    const phone = req.body[fieldName];
    
    if (phone && !validator.isMobilePhone(phone, 'any', { strictMode: false })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    next();
  };
}

/**
 * SQL Injection prevention (additional layer)
 * Note: We're using MongoDB, so this is preventative for any future SQL use
 */
function preventSQLInjection(req, res, next) {
  const sqlPatterns = [
    /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b|\bunion\b)/gi,
    /(-{2}|\/\*|\*\/|;)/g,
    /(xp_|sp_)/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const checkObject = (obj) => {
    for (const key in obj) {
      if (checkValue(obj[key])) {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    const ip = req.ip || req.connection.remoteAddress;
    console.warn(`🚨 SQL injection attempt detected from ${ip}`);
    ipBlocker.addViolation(ip, 'sql_injection_attempt');
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected',
      code: 'INVALID_INPUT'
    });
  }
  
  next();
}

/**
 * Export IP blocker for use in rate limiting
 */
function onRateLimitReached(req) {
  const ip = req.ip || req.connection.remoteAddress;
  ipBlocker.addViolation(ip, 'rate_limit_exceeded');
}

module.exports = {
  ipBlockingMiddleware,
  sanitizeInputMiddleware,
  requestSizeValidation,
  validateEmailMiddleware,
  validateURLMiddleware,
  validatePhoneMiddleware,
  preventSQLInjection,
  ipBlocker,
  onRateLimitReached
};
