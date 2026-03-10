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
        hostname.includes('ayushmaanyadav.me') ||
        hostname.includes('onrender.com')) {
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
        apiUrl: 'https://api.ayushmaanyadav.me/api',
        enableDebug: true,
        enableServiceWorker: true
      },
      production: {
        apiUrl: 'https://api.ayushmaanyadav.me/api',
        enableDebug: false,
        enableServiceWorker: true,
        // Google OAuth Client ID loaded from meta tag for security
        googleClientId: this.getGoogleClientId()
      }
    };

    return configs[this.env] || configs.development;
  }

  getGoogleClientId() {
    // Get Google Client ID from meta tag instead of hardcoding
    const metaTag = document.querySelector('meta[name="google-client-id"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    // Fallback for development
    return this.env === 'development' ? '708319771344-gd8frork6c2r8o45rbkfctpk9nl8shdb.apps.googleusercontent.com' : null;
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
