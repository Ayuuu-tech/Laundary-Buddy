// laundry-auth.js - Authentication for Laundry Staff accounts
(function () {
  'use strict';

  class LaundryAuthManager {
    constructor() {
      this.storageKey = 'laundryBuddy_laundry_users';
      this.currentUserKey = 'laundryBuddy_currentLaundryUser';
    }

    // Create demo laundry staff if none exist
    async initializeDemoUsers() {
      const existing = localStorage.getItem(this.storageKey);
      if (existing && JSON.parse(existing).length > 0) return;

      // Wait for CryptoUtils
      let attempts = 0;
      while (!window.CryptoUtils && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (!window.CryptoUtils) {
        console.warn('CryptoUtils not available, skipping demo laundry user init');
        return;
      }

      const hashed = await window.CryptoUtils.hashPassword('123456');
      const demoUsers = [
        {
          id: 'LAU_DEMO_1',
          name: 'Laundry Admin',
          employeeId: 'LAU1001',
          email: 'laundry@bmu.edu.in',
          password: hashed,
          phone: '9876500000',
          role: 'laundry'
        }
      ];
      localStorage.setItem(this.storageKey, JSON.stringify(demoUsers));
      console.log('✅ Demo Laundry user: laundry@bmu.edu.in / 123456');
    }

    getAll() {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    }

    isLoggedIn() {
      return !!localStorage.getItem(this.currentUserKey);
    }

    getCurrentUser() {
      const d = localStorage.getItem(this.currentUserKey);
      return d ? JSON.parse(d) : null;
    }

    async login(emailOrId, password) {
      try {
        // Login via backend API instead of localStorage
        console.log('[Laundry Auth] Attempting backend login for:', emailOrId);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: emailOrId,
            password: password
          })
        });

        const data = await response.json();
        console.log('[Laundry Auth] Login response:', data);

        if (data.success) {
          const session = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
            role: 'laundry',
            loginTime: new Date().toISOString()
          };
          localStorage.setItem(this.currentUserKey, JSON.stringify(session));
          return { success: true, message: 'Login successful!', user: session };
        } else {
          return { success: false, message: data.message || 'Invalid credentials' };
        }
      } catch (e) {
        console.error('Laundry login error:', e);
        return { success: false, message: 'Error logging in. Please try again.' };
      }
    }

    async logout() {
      // Call backend logout to clear session
      try {
        await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.error('Backend logout error:', e);
      }
      
      // Clear localStorage
      localStorage.removeItem(this.currentUserKey);
      window.location.href = 'index.html';
    }

    requireLaundryAuth() {
      if (!this.isLoggedIn()) {
        alert('Please login as Laundry Staff to access this page.');
        window.location.href = 'laundry-login.html';
        return false;
      }
      return true;
    }
  }

  window.laundryAuthManager = new LaundryAuthManager();

  // Initialize demo user (async)
  (async () => {
    await window.laundryAuthManager.initializeDemoUsers();
  })();
})();
