require('dotenv').config();

// Validate environment variables before starting
const { validateEnv } = require('./config/env-validator');
validateEnv();

// Initialize monitoring (Sentry, etc.)
const { initSentry, getSentryMiddleware, setupHealthCheck, setupDatabaseQueryLogging } = require('./config/monitoring');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { apiLimiter, helmetConfig } = require('./middleware/security');
const { logger, httpLogger } = require('./middleware/logger');
const { httpsSecurityMiddleware } = require('./middleware/https');
const path = require('path');
const {
  ipBlockingMiddleware,
  sanitizeInputMiddleware,
  preventSQLInjection
} = require('./middleware/advanced-security');

const app = express();
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const PORT = process.env.PORT || 3000;

// Initialize Sentry first (before any other middleware)
initSentry(app);

const sentryMiddleware = getSentryMiddleware();
app.use(sentryMiddleware.requestHandler);
app.use(sentryMiddleware.tracingHandler);

// Trust proxy (important for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// HTTPS enforcement and security headers (must be early in middleware chain)
app.use(httpsSecurityMiddleware);

// Security middleware
app.use(helmetConfig);

// Compression middleware
app.use(compression());

// Cookie parser
app.use(cookieParser());

// CORS configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:5501', 'http://localhost:5501', 'https://laundrybuddy.ayushmaanyadav.me'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In production, check allowed origins strictly
    if (isProduction) {
      // Allow Cloudflare Pages and configured origins
      if (origin.includes('.pages.dev') || origin.includes('cloudflare') ||
        allowedOrigins.some(allowed => origin.includes(allowed.replace(/https?:\/\//, '')))) {
        return callback(null, true);
      }
      // Check exact match
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'x-laundry-key']
}));

// Session configuration with MongoDB store
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'laundry-buddy-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/laundry_buddy',
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600,
    autoRemove: 'native'
  }),
  cookie: {
    secure: isProduction, // true in production (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
    path: '/',
    domain: isProduction ? '.ayushmaanyadav.me' : undefined // Enable cross-subdomain cookies in production
  }
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// IP blocking middleware (should be early)
app.use(ipBlockingMiddleware);

// Advanced input sanitization
app.use(sanitizeInputMiddleware);

// Prevent SQL injection attempts
app.use(preventSQLInjection);

// Sanitize data to prevent MongoDB injection
app.use(mongoSanitize());

// HTTP request logging
app.use(httpLogger);

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// CSRF Protection
const { validateCSRFToken, getCSRFTokenRoute } = require('./middleware/csrf');
app.get('/api/csrf-token', getCSRFTokenRoute);
app.use(validateCSRFToken);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/googleAuth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/support', require('./routes/support'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/user', require('./routes/user'));

// Health check route (before error handlers)
setupHealthCheck(app);

// Sentry error handler (must be before any other error middleware)
app.use(sentryMiddleware.errorHandler);
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Laundry Buddy API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Laundry Buddy API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      tracking: '/api/tracking',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  // Don't leak error details in production
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

let server;

// Start server function
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();
    const mongoose = require('mongoose');
    app.locals.db = mongoose.connection.db;

    // Setup database query logging
    setupDatabaseQueryLogging(mongoose);

    // Start scheduler
    const { startScheduler } = require('./cron/scheduler');
    startScheduler();

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info('========================================');
      logger.info('🚀 Laundry Buddy Backend Started!');
      logger.info('========================================');
      logger.info(`📍 Server URL: http://localhost:${PORT}`);
      logger.info(`📊 Health Check: http://localhost:${PORT}/api/health`);
      logger.info(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`💾 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
      logger.info('========================================');
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

start();

module.exports = app;
