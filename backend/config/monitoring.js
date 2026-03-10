// Monitoring and Logging Setup Guide

/**
 * Sentry Integration for Error Tracking (v10+ API)
 * Install: npm install @sentry/node @sentry/profiling-node
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry (v10 API)
 * Call this at the very beginning of server.js
 */
function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Enable profiling (v10 API)
      nodeProfilingIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Set profilesSampleRate to 1.0 to profile 100% of transactions
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Don't log sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        if (typeof event.request.data === 'object') {
          delete event.request.data.password;
          delete event.request.data.newPassword;
          delete event.request.data.confirmPassword;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'top.GLOBALS',
      'NetworkError',
      'Network request failed',
      'Cannot read property \'match\' of undefined',
    ],
  });

  console.log('✅ Sentry error tracking initialized');
}

/**
 * Sentry Express middleware (v10 API)
 * In v10, request/tracing handlers are automatic. Only error handler needs setup.
 */
function getSentryMiddleware() {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  Sentry middleware disabled (missing DSN)');
    const passthrough = (req, res, next) => next();
    const errorPassthrough = (err, req, res, next) => next(err);
    return {
      requestHandler: passthrough,
      tracingHandler: passthrough,
      errorHandler: errorPassthrough
    };
  }

  // In Sentry v10, request/tracing are auto-instrumented.
  // We provide no-op passthroughs for requestHandler/tracingHandler
  // and use Sentry.expressErrorHandler() for error handling.
  const passthrough = (req, res, next) => next();
  return {
    requestHandler: passthrough,
    tracingHandler: passthrough,
    errorHandler: Sentry.expressErrorHandler ? Sentry.expressErrorHandler() : ((err, req, res, next) => next(err))
  };
}

/**
 * Security Event Logger
 * Logs important security events to both database and external service
 */
async function securityLogger(userId, event, metadata = {}) {
  try {
    const SecurityLog = require('../models/SecurityLog');

    // Log to database
    await SecurityLog.create({
      userId,
      event,
      metadata,
      timestamp: new Date()
    });

    // Log to Sentry for critical events
    const criticalEvents = [
      'LOGIN_FAILED',
      'LOGIN_LOCKED',
      'SUSPICIOUS_ACTIVITY',
      'SQL_INJECTION_ATTEMPT'
    ];

    if (criticalEvents.includes(event)) {
      Sentry.captureMessage(`Security Event: ${event}`, {
        level: 'warning',
        extra: {
          userId,
          event,
          metadata
        }
      });
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 Security Event: ${event}`, { userId, metadata });
    }
  } catch (error) {
    console.error('Failed to log security event:', error);

    // Still try to notify Sentry about the logging failure
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }
}

// Export security logger for use via require() (no global mutation)
// Usage: const { securityLogger } = require('./config/monitoring');

/**
 * Performance Monitoring Helper
 */
function measurePerformance(operation) {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`⚠️  Slow operation: ${operation} took ${duration}ms`);

        // Send to Sentry
        if (Sentry && process.env.SENTRY_DSN) {
          Sentry.captureMessage(`Slow operation: ${operation}`, {
            level: 'warning',
            extra: { operation, duration }
          });
        }
      }
      return duration;
    }
  };
}

/**
 * Database Query Logger
 * Logs slow database queries
 */
function setupDatabaseQueryLogging(mongoose) {
  if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', true);
  }

  // Log slow queries
  mongoose.plugin((schema) => {
    schema.pre(/^find/, function () {
      this._startTime = Date.now();
    });

    schema.post(/^find/, function () {
      if (this._startTime) {
        const duration = Date.now() - this._startTime;
        if (duration > 100) { // Log queries slower than 100ms
          console.warn(`🐢 Slow query: ${this.mongooseCollection.name}.${this.op} took ${duration}ms`);

          if (Sentry && process.env.SENTRY_DSN) {
            Sentry.captureMessage('Slow database query', {
              level: 'warning',
              extra: {
                collection: this.mongooseCollection.name,
                operation: this.op,
                duration,
                query: this.getQuery()
              }
            });
          }
        }
      }
    });
  });
}

/**
 * Request Logger Middleware
 * More detailed than the basic HTTP logger
 */
function detailedRequestLogger(req, res, next) {
  const start = Date.now();
  const requestId = require('crypto').randomBytes(8).toString('hex');

  // Add request ID to request object
  req.requestId = requestId;

  // Log request
  console.log(`→ [${requestId}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.session?.userId
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    console.log(`← [${requestId}] ${res.statusCode} ${duration}ms`);

    // Send slow requests to Sentry
    if (duration > 3000 && Sentry && process.env.SENTRY_DSN) {
      Sentry.captureMessage('Slow API response', {
        level: 'warning',
        extra: {
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode
        }
      });
    }
  });

  next();
}

/**
 * Health Check Monitoring
 * Creates /health endpoint with detailed system info
 */
function setupHealthCheck(app) {
  app.get('/health', async (req, res) => {
    const mongoose = require('mongoose');

    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {
        database: 'unknown',
        memory: 'unknown',
        cpu: 'unknown'
      }
    };

    // Check database connection
    try {
      if (mongoose.connection.readyState === 1) {
        healthCheck.checks.database = 'connected';
      } else {
        healthCheck.checks.database = 'disconnected';
        healthCheck.status = 'unhealthy';
      }
    } catch (error) {
      healthCheck.checks.database = 'error';
      healthCheck.status = 'unhealthy';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    };

    // Check if memory usage is too high
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      healthCheck.status = 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  });
}

/**
 * Uptime Monitoring Setup Instructions
 */
const uptimeMonitoringInstructions = `
# Uptime Monitoring Setup

## Option 1: UptimeRobot (Free)
1. Sign up at https://uptimerobot.com
2. Add new monitor
3. Type: HTTP(s)
4. URL: https://your-domain.com/health
5. Monitoring Interval: 5 minutes
6. Alert contacts: Your email/SMS

## Option 2: Better Uptime
1. Sign up at https://betteruptime.com
2. Add new monitor
3. URL: https://your-domain.com/health
4. Set expected status code: 200
5. Configure incident notifications

## Option 3: Pingdom
1. Sign up at https://www.pingdom.com
2. Add Uptime Check
3. URL: https://your-domain.com/health
4. Check interval: 1 minute
5. Set up alerting rules

## What to Monitor:
- Main application endpoint: /health
- API endpoints: /api/health
- Database connectivity
- Response time thresholds
- SSL certificate expiration
`;

module.exports = {
  initSentry,
  getSentryMiddleware,
  securityLogger,
  measurePerformance,
  setupDatabaseQueryLogging,
  detailedRequestLogger,
  setupHealthCheck,
  uptimeMonitoringInstructions
};
