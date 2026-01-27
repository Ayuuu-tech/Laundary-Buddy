// laundry-auth.js - Authentication for Laundry Staff accounts (Backend Integrated)
(function () {
  'use strict';

  class LaundryAuthManager {
    constructor() {
      this.currentUser = null;
    }

    // Check if user is logged in by fetching from backend
    async isLoggedIn() {
      try {
        const user = await this.getCurrentUser();
        return user && (user.isAdmin || user.role === 'laundry' || user.role === 'admin');
      } catch (e) {
        return false;
      }
    }

    // Get current logged-in user from server
    async getCurrentUser() {
      try {
        // Use the student auth endpoint since staff are also users (admins)
        // Or if there's a specific admin/me endpoint. auth/me is generic.
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            this.currentUser = data.user;
            // Verify role
            if (data.user.isAdmin || data.user.role === 'laundry' || data.user.role === 'admin') {
              return data.user;
            }
          }
        }
        return null;
      } catch (error) {
        console.error('Auth check error:', error);
        return null;
      }
    }

    // Login (proxies to standard login but enforces role check)
    async login(email, password) {
      try {
        console.log('[Laundry Auth] Attempting backend login for:', email);

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: email,
            password: password
          })
        });

        const data = await response.json();

        if (data.success) {
          if (data.user.isAdmin || data.user.role === 'laundry' || data.user.role === 'admin') {
            this.currentUser = data.user;
            return { success: true, message: 'Login successful!', user: data.user };
          } else {
            // Logout if not authorized
            await this.logout();
            return { success: false, message: 'Access denied: Laundry/Admin role required.' };
          }
        } else {
          return { success: false, message: data.message || 'Invalid credentials' };
        }
      } catch (e) {
        console.error('Laundry login error:', e);
        return { success: false, message: 'Error logging in. Please try again.' };
      }
    }

    async logout() {
      try {
        await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.error('Backend logout error:', e);
      }
      this.currentUser = null;
      localStorage.removeItem('laundryBuddy_currentLaundryUser'); // Clear legacy if exists
      window.location.href = 'index.html';
    }

    async requireLaundryAuth() {
      const loggedIn = await this.isLoggedIn();
      if (!loggedIn) {
        // If on login page, don't redirect
        if (!window.location.pathname.includes('laundry-login.html')) {
          alert('Please login as Laundry Staff/Admin to access this page.');
          window.location.href = 'laundry-login.html';
        }
        return false;
      }
      return true;
    }
  }

  window.laundryAuthManager = new LaundryAuthManager();

  console.log('✅ Laundry Auth system initialized (Backend Mode)');
})();
