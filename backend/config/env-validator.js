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

// Environment Variable Validator

const requiredEnvVars = {
  production: [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM',
    'ALLOWED_ORIGINS'
  ],
  development: [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ]
};

const recommendedEnvVars = [
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'MAX_LOGIN_ATTEMPTS',
  'ACCOUNT_LOCKOUT_DURATION',
  'SENTRY_DSN'
];

function validateEnv() {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;

  console.log(`🔍 Validating environment variables for: ${env}`);

  const missing = [];
  const weak = [];

  required.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      if (env === 'production') {
        if (varName === 'JWT_SECRET' &&
            (value.includes('change') || value.includes('secret') || value.length < 32)) {
          weak.push(`${varName}: appears to be using default or weak value`);
        }
        if (varName === 'SESSION_SECRET' &&
            (value.includes('change') || value.includes('secret') || value.length < 32)) {
          weak.push(`${varName}: appears to be using default or weak value`);
        }
      }
    }
  });

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Create a .env file based on .env.example\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (weak.length > 0) {
    console.warn('\n⚠️  WARNING: Weak or default values detected:');
    weak.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('\n💡 Generate strong secrets using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    if (env === 'production') {
      throw new Error('Cannot start in production with weak/default secrets');
    }
  }

  const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);
  if (missingRecommended.length > 0) {
    console.warn('\n📋 Optional but recommended environment variables not set:');
    missingRecommended.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   These will use default values.\n');
  }

  validateSpecificFormats();
  console.log('✅ Environment validation passed\n');
}

function validateSpecificFormats() {
  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      console.warn('⚠️  DATABASE_URL format may be invalid (should start with postgresql:// or postgres://)');
    }
  }

  if (process.env.RESEND_FROM) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.RESEND_FROM)) {
      console.warn('⚠️  RESEND_FROM does not appear to be a valid email address');
    }
  }

  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    console.warn('⚠️  PORT should be a number');
  }
}

function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

function getEnvInt(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

module.exports = { validateEnv, getEnv, getEnvInt, getEnvBool };
