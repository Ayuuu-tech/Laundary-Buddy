// Environment Configuration Helper
class EnvironmentConfig {
  constructor() {
    this.env = this.detectEnvironment();
    this.config = this.loadConfig();
  }

  detectEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    // Add your production domain
    if (hostname.includes('vercel.app') || 
        hostname.includes('netlify.app') || 
        hostname.includes('github.io') ||
        hostname === 'your-domain.com') {
      return 'production';
    }
    
    return 'staging';
  }

  loadConfig() {
    const configs = {
      development: {
        apiUrl: 'http://localhost:3000/api',
        enableDebug: true,
        enableServiceWorker: false
      },
      staging: {
        apiUrl: 'https://your-staging-backend.onrender.com/api',
        enableDebug: true,
        enableServiceWorker: true
      },
      production: {
        apiUrl: 'https://laundry-buddy-api.onrender.com/api',
        enableDebug: false,
        enableServiceWorker: true,
        // Google OAuth Client ID for production (update this in render environment if you rotate keys)
        googleClientId: '708319771344-gd8frork6c2r8o45rbkfctpk9nl8shdb.apps.googleusercontent.com'
      }
    };

    return configs[this.env] || configs.development;
  }

  get apiUrl() {
    return this.config.apiUrl;
  }

  get isProduction() {
    return this.env === 'production';
  }

  get isDevelopment() {
    return this.env === 'development';
  }

  log(...args) {
    if (this.config.enableDebug) {
      console.log(`[${this.env.toUpperCase()}]`, ...args);
    }
  }
}

// Export singleton instance
window.ENV_CONFIG = new EnvironmentConfig();
console.log('🌍 Environment:', window.ENV_CONFIG.env);
console.log('🔗 API URL:', window.ENV_CONFIG.apiUrl);
