// auth.js - Database-driven authentication (no localStorage)
(function () {
  'use strict';

  // Authentication Manager Class - completely server-side
  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.checkingAuth = false;
    }

    // Register a new user
    async signup(userData) {
      try {
        const response = await apiClient.post('/api/auth/register', {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          phone: userData.phone || '',
          address: userData.address || ''
        });

        if (response.success) {
          this.currentUser = response.user;
          return { success: true, message: 'Account created successfully!', user: response.user };
        }
        return response;
      } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: error.message || 'Error creating account. Please try again.' };
      }
    }

    // Login user
    async login(email, password) {
      try {
        const response = await apiClient.post('/api/auth/login', {
          email: email,
          password: password
        });

        if (response.success) {
          this.currentUser = response.user;
          return { success: true, message: 'Login successful!', user: response.user };
        }
        return response;
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: error.message || 'Error logging in. Please try again.' };
      }
    }

    // Logout user
    async logout() {
      try {
        await apiClient.post('/api/auth/logout');
        this.currentUser = null;
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Logout error:', error);
        // Force logout on client even if server fails
        this.currentUser = null;
        window.location.href = 'index.html';
      }
    }

    // Check if user is logged in by fetching from server
    async isLoggedIn() {
      if (this.checkingAuth) return false;
      
      try {
        this.checkingAuth = true;
        const user = await this.getCurrentUser();
        this.checkingAuth = false;
        return user !== null;
      } catch (error) {
        this.checkingAuth = false;
        return false;
      }
    }

    // Get current logged-in user from server
    async getCurrentUser() {
      try {
        if (this.currentUser) {
          return this.currentUser;
        }

        const response = await apiClient.get('/api/auth/me');
        if (response.success) {
          this.currentUser = response.user;
          return response.user;
        }
        return null;
      } catch (error) {
        this.currentUser = null;
        return null;
      }
    }

    // Update current user profile
    async updateProfile(updatedData) {
      try {
        // Merge with current user data to allow partial updates (e.g., just photo)
        const dataToSend = { ...this.currentUser, ...updatedData };
        const response = await apiClient.put('/api/auth/profile', dataToSend);
        if (response.success) {
          this.currentUser = response.user;
          return { success: true, message: 'Profile updated successfully!', user: response.user };
        }
        return response;
      } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, message: error.message || 'Error updating profile' };
      }
    }

    // Change password
    async changePassword(oldPassword, newPassword) {
      try {
        const response = await apiClient.put('/api/auth/change-password', {
          oldPassword: oldPassword,
          newPassword: newPassword
        });
        
        return response;
      } catch (error) {
        console.error('Change password error:', error);
        return { success: false, message: error.message || 'Error changing password' };
      }
    }

    // Google Sign-In
    async googleSignIn(credential) {
      try {
        const response = await apiClient.post('/api/auth/google', { credential });
        
        if (response.success) {
          this.currentUser = response.user;
          return response;
        }
        return response;
      } catch (error) {
        console.error('Google sign-in error:', error);
        return { success: false, message: error.message || 'Error with Google sign-in' };
      }
    }

    // Require authentication (redirect to login if not logged in)
    async requireAuth() {
      const loggedIn = await this.isLoggedIn();
      if (!loggedIn) {
        alert('Please login to access this page.');
        window.location.href = 'login.html';
        return false;
      }
      return true;
    }

    // Function to load user's profile photo
    async loadProfilePhoto() {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !currentUser.profilePhoto) return;

      // Update all profile images on the page
      const headerProfileImgs = document.querySelectorAll('.header-actions img, header img[alt*="Profile"], header img[alt*="User"]');
      headerProfileImgs.forEach(img => {
        img.src = currentUser.profilePhoto;
      });
    }
  }

  // Create global instance
  window.authManager = new AuthManager();

  console.log('✅ Auth system initialized (database-driven, no localStorage)');
})();
