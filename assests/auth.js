// auth.js - Authentication utility for managing user sessions
(function () {
  'use strict';

  // Authentication Manager Class
  class AuthManager {
    constructor() {
      this.storageKey = 'laundryBuddy_users';
      this.currentUserKey = 'laundryBuddy_currentUser';
      this.tokenKey = 'authToken';
    }

    // Register a new user
    async signup(userData) {
      try {
        const response = await apiClient.post('/auth/register', {
          name: userData.name,
          email: userData.email || `${userData.studentId}@bmu.edu.in`,
          password: userData.password,
          phone: userData.phone || '',
          address: `${userData.hostelRoom || ''}, Student ID: ${userData.studentId}`
        });

        if (response.success) {
          // Store token and user data
          apiClient.setToken(response.token);
          const sessionData = {
            ...response.user,
            studentId: userData.studentId,
            hostelRoom: userData.hostelRoom,
            laundryPreferences: userData.preferences || 'Standard detergent',
            profilePhoto: userData.profilePhoto || null,
            loginTime: new Date().toISOString()
          };
          localStorage.setItem(this.currentUserKey, JSON.stringify(sessionData));
          return { success: true, message: 'Account created successfully!', user: sessionData };
        }
        return response;
      } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: error.message || 'Error creating account. Please try again.' };
      }
    }

    // Login user
    async login(studentIdOrEmail, password) {
      try {
        const response = await apiClient.post('/auth/login', {
          email: studentIdOrEmail,
          password: password
        });

        if (response.success) {
          // Store token and user data
          apiClient.setToken(response.token);
          const sessionData = {
            ...response.user,
            studentId: response.user.address?.split('Student ID: ')[1] || studentIdOrEmail,
            hostelRoom: response.user.address?.split(',')[0] || '',
            laundryPreferences: 'Standard detergent',
            profilePhoto: null,
            loginTime: new Date().toISOString()
          };
          localStorage.setItem(this.currentUserKey, JSON.stringify(sessionData));
          return { success: true, message: 'Login successful!', user: sessionData };
        }
        return response;
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: error.message || 'Error logging in. Please try again.' };
      }
    }

    // Logout user
    logout() {
      localStorage.removeItem(this.currentUserKey);
      apiClient.setToken(null);
      window.location.href = 'index.html';
    }

    // Check if user is logged in
    isLoggedIn() {
      const currentUser = localStorage.getItem(this.currentUserKey);
      const token = localStorage.getItem(this.tokenKey);
      return currentUser !== null && token !== null;
    }

    // Get current logged-in user
    getCurrentUser() {
      const userData = localStorage.getItem(this.currentUserKey);
      return userData ? JSON.parse(userData) : null;
    }

    // Get all registered users (kept for backward compatibility)
    getAllUsers() {
      const usersData = localStorage.getItem(this.storageKey);
      return usersData ? JSON.parse(usersData) : [];
    }

    // Update current user profile
    async updateProfile(updatedData) {
      try {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          return { success: false, message: 'No user logged in!' };
        }

        const response = await apiClient.put('/auth/profile', {
          name: updatedData.name,
          phone: updatedData.phone,
          address: updatedData.address || `${updatedData.hostelRoom || ''}, Student ID: ${updatedData.studentId || currentUser.studentId}`
        });

        if (response.success) {
          const updatedSession = {
            ...currentUser,
            ...response.user,
            ...updatedData
          };
          localStorage.setItem(this.currentUserKey, JSON.stringify(updatedSession));
          return { success: true, message: 'Profile updated successfully!', user: updatedSession };
        }
        return response;
      } catch (error) {
        console.error('Update error:', error);
        return { success: false, message: error.message || 'Error updating profile.' };
      }
    }

    // Generate unique user ID
    generateUserId() {
      return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Require authentication (redirect to login if not logged in)
    requireAuth() {
      if (!this.isLoggedIn()) {
        alert('Please login to access this page.');
        window.location.href = 'login.html';
        return false;
      }
      return true;
    }

    // Initialize with demo users (for testing) - Now handled by backend
    async initializeDemoUsers() {
      console.log('Demo users are now handled by backend API');
      console.log('You can register new users through the signup form');
    }
  }

  // Create global instance
  window.authManager = new AuthManager();

  // Initialize - Just log message about backend
  console.log('Auth system initialized with backend API integration');

  // Function to load user's profile photo on all pages
  function loadProfilePhoto() {
    const currentUser = window.authManager.getCurrentUser();
    if (!currentUser) return;

    // Get user's full data including profile photo
    const users = JSON.parse(localStorage.getItem('laundryBuddy_users') || '[]');
    const userWithPhoto = users.find(u => u.id === currentUser.id);

    if (userWithPhoto && userWithPhoto.profilePhoto) {
      // Update all profile images on the page
      const headerProfileImgs = document.querySelectorAll('.header-actions img, header img[alt*="Profile"], header img[alt*="User"]');
      headerProfileImgs.forEach(img => {
        img.src = userWithPhoto.profilePhoto;
      });
    }
  }

  // Load profile photo when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProfilePhoto);
  } else {
    loadProfilePhoto();
  }

  // Make loadProfilePhoto available globally
  window.loadProfilePhoto = loadProfilePhoto;

  console.log('Auth system initialized');
})();
