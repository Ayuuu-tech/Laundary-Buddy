// API Configuration
// Automatically detects environment and uses appropriate API URL
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Production deployments
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Custom domain for backend API
    return 'https://api.ayushmaanyadav.me';
  }
  
  // Development (localhost)
  return 'http://localhost:3000/api';
};

const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    // Auth endpoints
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GET_USER: '/auth/me',
    UPDATE_PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    
    // Order endpoints
    ORDERS: '/orders',
    ORDER_HISTORY: '/orders/history',
    
    // Tracking endpoints
    TRACKING: '/tracking',
    TRACK_BY_ORDER: '/tracking/order'
  }
};

// Log the current API URL for debugging
console.log('🔗 API Base URL:', API_CONFIG.BASE_URL);

// HTTP Request Helper - Session-based (no tokens)
class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      credentials: 'include', // Important: Send cookies with requests
      headers: this.getHeaders()
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle auth failures - but don't redirect from public pages
        if (response.status === 401 && 
            !endpoint.includes('/auth/login') && 
            !endpoint.includes('/auth/register') && 
            !endpoint.includes('/auth/me')) {
          console.warn('Session expired/invalid. Redirecting to login...');
          if (typeof window !== 'undefined' && 
              !location.href.includes('login.html') && 
              !location.href.includes('signup.html') && 
              !location.href.includes('index.html')) {
            window.location.href = 'login.html';
          }
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create global API client instance
const apiClient = new APIClient();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, APIClient, apiClient };
}
