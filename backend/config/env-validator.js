// Environment Variable Validator
// Validates that all required environment variables are set on startup

const requiredEnvVars = {
  production: [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'SESSION_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM',
    'ALLOWED_ORIGINS'
  ],
  development: [
    'NODE_ENV',
    'MONGODB_URI',
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

/**
 * Validates environment variables based on NODE_ENV
 * @throws {Error} if required variables are missing
 */
function validateEnv() {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;
  
  console.log(`🔍 Validating environment variables for: ${env}`);
  
  const missing = [];
  const weak = [];
  
  // Check required variables
  required.forEach(varName => {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      missing.push(varName);
    } else {
      // Check for default/weak values in production
      if (env === 'production') {
        if (varName === 'JWT_SECRET' && 
            (value.includes('change') || value.includes('secret') || value.length < 32)) {
          weak.push(`${varName}: appears to be using default or weak value`);
        }
        if (varName === 'SESSION_SECRET' && 
            (value.includes('change') || value.includes('secret') || value.length < 32)) {
          weak.push(`${varName}: appears to be using default or weak value`);
        }
        if (varName === 'MONGODB_URI' && value.includes('username:password')) {
          weak.push(`${varName}: appears to be using placeholder credentials`);
        }
      }
    }
  });
  
  // Report missing variables
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Create a .env file based on .env.example\n');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Warn about weak values
  if (weak.length > 0) {
    console.warn('\n⚠️  WARNING: Weak or default values detected:');
    weak.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('\n💡 Generate strong secrets using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n');
    
    if (env === 'production') {
      throw new Error('Cannot start in production with weak/default secrets');
    }
  }
  
  // Check recommended variables
  const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);
  if (missingRecommended.length > 0) {
    console.warn('\n📋 Optional but recommended environment variables not set:');
    missingRecommended.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('   These will use default values.\n');
  }
  
  // Validate specific formats
  validateSpecificFormats();
  
  console.log('✅ Environment validation passed\n');
}

/**
 * Validates specific environment variable formats
 */
function validateSpecificFormats() {
  // Validate MongoDB URI format
  if (process.env.MONGODB_URI) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      console.warn('⚠️  MONGODB_URI format may be invalid (should start with mongodb:// or mongodb+srv://)');
    }
  }
  
  // Validate email format for RESEND_FROM
  if (process.env.RESEND_FROM) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.RESEND_FROM)) {
      console.warn('⚠️  RESEND_FROM does not appear to be a valid email address');
    }
  }
  
  // Validate PORT is a number
  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    console.warn('⚠️  PORT should be a number');
  }
  
  // Validate rate limit values
  if (process.env.RATE_LIMIT_WINDOW_MS && isNaN(parseInt(process.env.RATE_LIMIT_WINDOW_MS))) {
    console.warn('⚠️  RATE_LIMIT_WINDOW_MS should be a number (milliseconds)');
  }
  if (process.env.RATE_LIMIT_MAX_REQUESTS && isNaN(parseInt(process.env.RATE_LIMIT_MAX_REQUESTS))) {
    console.warn('⚠️  RATE_LIMIT_MAX_REQUESTS should be a number');
  }
}

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {*} Environment variable value or default
 */
function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Get environment variable as integer
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Parsed integer or default
 */
function getEnvInt(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable as boolean
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Boolean value or default
 */
function getEnvBool(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

module.exports = {
  validateEnv,
  getEnv,
  getEnvInt,
  getEnvBool
};
