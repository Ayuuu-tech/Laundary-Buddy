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

require('dotenv').config();

// Validate environment variables before starting
const { validateEnv } = require('./config/env-validator');
validateEnv();

// Initialize monitoring (Sentry, etc.)
const { initSentry, getSentryMiddleware, setupHealthCheck } = require('./config/monitoring');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const { connectDB, getSequelize } = require('./config/db');
const { apiLimiter, helmetConfig } = require('./middleware/security');
const { logger, httpLogger } = require('./middleware/logger');
const { httpsSecurityMiddleware } = require('./middleware/https');
const path = require('path');
const {
  ipBlockingMiddleware,
  sanitizeInputMiddleware
} = require('./middleware/advanced-security');

const app = express();
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve Frontend Static Files (Unified Deployment)
app.use(express.static(path.join(__dirname, '../frontend')));
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
    if (!origin) {
      return callback(null, true);
    }
    logger.debug(`CORS check for origin: ${origin}`);
    logger.debug(`Allowed origins: ${allowedOrigins.join(', ')}`);

    if (isProduction) {
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      if (origin.includes('.pages.dev') ||
        origin.includes('.onrender.com') ||
        origin.includes('cloudflare')) {
        return callback(null, true);
      }
      const originDomain = origin.replace(/https?:\/\//, '');
      if (allowedOrigins.some(allowed => {
        const allowedDomain = allowed.replace(/https?:\/\//, '');
        return originDomain === allowedDomain;
      })) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['set-cookie'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'x-laundry-key', 'x-csrf-token']
}));

// Session configuration with PostgreSQL store (Supabase)
const getSessionSecret = () => {
  if (!process.env.SESSION_SECRET) {
    if (isProduction) {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    logger.warn('Using default SESSION_SECRET for development only');
    return 'dev-only-secret-do-not-use-in-production';
  }
  return process.env.SESSION_SECRET;
};

// PostgreSQL pool for session store
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sessionStore = new pgSession({
  pool: pgPool,
  tableName: 'sessions',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15 // Prune every 15 minutes
});

app.use(session({
  name: 'connect.sid',
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    domain: isProduction ? '.ayushmaanyadav.me' : undefined
  }
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// IP blocking middleware (should be early)
app.use(ipBlockingMiddleware);

// Advanced input sanitization
app.use(sanitizeInputMiddleware);

// HTTP request logging
app.use(httpLogger);

// Activity logging (stores every API request in Supabase)
const { activityLoggerMiddleware } = require('./middleware/activityLogger');
app.use(activityLoggerMiddleware);

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
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/user'));

// Health check route
setupHealthCheck(app);

// Sentry error handler
app.use(sentryMiddleware.errorHandler);
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Laundry Buddy API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  };
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.stack;
  }
  res.status(err.status || 500).json(errorResponse);
});

let server;

async function start() {
  try {
    // Connect to PostgreSQL (Supabase)
    const sequelize = await connectDB();

    // Initialize all models and associations
    const { initModels } = require('./models/index');
    initModels(sequelize);

    // Sync database (create tables if they don't exist)
    // Note: Use { force: false } (default) to avoid ALTER TABLE issues with Supabase pooler
    // For schema changes, use Sequelize migrations or the Supabase SQL editor
    await sequelize.sync();
    
    // Explicitly add new columns to orders table in case they weren't added by sync
    try {
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "feedbackRating" INTEGER;');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "feedbackComment" TEXT;');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "feedbackSubmittedAt" TIMESTAMP WITH TIME ZONE;');
      
      // Fix support_tickets constraints that sync won't update
      await sequelize.query('ALTER TABLE "support_tickets" ALTER COLUMN "orderId" DROP NOT NULL;');
      await sequelize.query('ALTER TABLE "support_tickets" ALTER COLUMN "orderNumber" DROP NOT NULL;');
      console.log('✅ Checked/Added database schema updates (feedback columns, support constraints)');
    } catch (err) {
      console.log('⚠️ Could not apply some manual schema updates:', err.message);
    }
    
    console.log('✅ Database tables synced');

    app.locals.sequelize = sequelize;

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
      logger.info('💾 Database: PostgreSQL (Supabase) Connected');
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
    server.close(async () => {
      const sequelize = getSequelize();
      if (sequelize) {
        await sequelize.close();
      }
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
    server.close(async () => {
      const sequelize = getSequelize();
      if (sequelize) {
        await sequelize.close();
      }
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

start();

module.exports = app;
