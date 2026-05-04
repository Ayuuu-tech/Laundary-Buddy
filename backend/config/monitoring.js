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

// Monitoring and Logging Setup Guide

/**
 * Sentry Integration for Error Tracking
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry
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
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration()
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    beforeSend(event, hint) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        if (typeof event.request.data === 'object') {
          delete event.request.data.password;
          delete event.request.data.newPassword;
          delete event.request.data.confirmPassword;
        }
      }
      return event;
    },

    ignoreErrors: ['top.GLOBALS', 'NetworkError', 'Network request failed', "Cannot read property 'match' of undefined"]
  });

  console.log('✅ Sentry error tracking initialized');
}

/**
 * Sentry Express middleware
 */
function getSentryMiddleware() {
  const handlers = Sentry?.Handlers;
  if (!process.env.SENTRY_DSN || !handlers) {
    console.warn('⚠️  Sentry middleware disabled (missing DSN or Handlers)');
    const passthrough = (req, res, next) => next();
    const errorPassthrough = (err, req, res, next) => next(err);
    return {
      requestHandler: passthrough,
      tracingHandler: passthrough,
      errorHandler: errorPassthrough
    };
  }

  return {
    requestHandler: handlers.requestHandler(),
    tracingHandler: handlers.tracingHandler(),
    errorHandler: handlers.errorHandler()
  };
}

/**
 * Security Event Logger
 */
async function securityLogger(userId, event, metadata = {}) {
  try {
    const { getSecurityLogModel } = require('../models/SecurityLog');
    const SecurityLog = getSecurityLogModel();

    await SecurityLog.create({
      userId,
      event,
      metadata,
      timestamp: new Date()
    });

    const criticalEvents = ['LOGIN_FAILED', 'LOGIN_LOCKED', 'SUSPICIOUS_ACTIVITY', 'SQL_INJECTION_ATTEMPT'];

    if (criticalEvents.includes(event)) {
      Sentry.captureMessage(`Security Event: ${event}`, {
        level: 'warning',
        extra: { userId, event, metadata }
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔐 Security Event: ${event}`, { userId, metadata });
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
    if (Sentry && process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }
}

// Make security logger globally available
if (typeof global !== 'undefined') {
  global.securityLogger = securityLogger;
}

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
 * Database Query Logger (Sequelize version)
 */
function setupDatabaseQueryLogging(sequelize) {
  // Sequelize logging is configured in db.js via the `logging` option
  // Additional slow query logging can be done via Sequelize hooks
  if (process.env.NODE_ENV !== 'production' && sequelize) {
    console.log('📊 Database query logging enabled via Sequelize');
  }
}

/**
 * Health Check Monitoring
 */
function setupHealthCheck(app) {
  app.get('/health', async (req, res) => {
    const { getSequelize } = require('./db');
    const sequelize = getSequelize();

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
      if (sequelize) {
        await sequelize.authenticate();
        healthCheck.checks.database = 'connected';
      } else {
        healthCheck.checks.database = 'not initialized';
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

    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      healthCheck.status = 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  });
}

module.exports = {
  initSentry,
  getSentryMiddleware,
  securityLogger,
  measurePerformance,
  setupDatabaseQueryLogging,
  setupHealthCheck
};
