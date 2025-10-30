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
        const users = this.getAll();
        const user = users.find(u => u.email === emailOrId || u.employeeId === emailOrId);
        if (!user) {
          return { success: false, message: 'Invalid Email/Employee ID or Password!' };
        }

        // Wait for CryptoUtils if needed
        let attempts = 0;
        while (!window.CryptoUtils && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        if (!window.CryptoUtils) {
          return { success: false, message: 'System not ready. Please retry.' };
        }

        const valid = await window.CryptoUtils.verifyPassword(password, user.password);
        if (!valid) {
          return { success: false, message: 'Invalid Email/Employee ID or Password!' };
        }

        const session = {
          id: user.id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          phone: user.phone,
          role: 'laundry',
          loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.currentUserKey, JSON.stringify(session));
        return { success: true, message: 'Login successful!', user: session };
      } catch (e) {
        console.error('Laundry login error:', e);
        return { success: false, message: 'Error logging in. Please try again.' };
      }
    }

    logout() {
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
