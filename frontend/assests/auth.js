// auth.js - Database-driven authentication (no localStorage)
(function () {
  'use strict';

  // Authentication Manager Class - completely server-side
  class AuthManager {
    constructor() {
      this.currentUser = null;
      this.checkingAuth = false;
    }

    // Register a new user with OTP flow
    async signup(userData, otp = null) {
      try {
        if (!otp) {
          // Step 1: Request OTP
          const response = await apiClient.post('/api/auth/request-signup-otp', {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            phone: userData.phone || '',
            address: userData.address || ''
          });
          return response;
        } else {
          // Step 2: Verify OTP
          const response = await apiClient.post('/api/auth/verify-signup-otp', {
            email: userData.email,
            otp: otp
          });
          if (response.success) {
            this.currentUser = response.user;
            return { success: true, message: 'Account created successfully!', user: response.user };
          }
          return response;
        }
      } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: error.message || 'Error creating account. Please try again.' };
      }
    }


    // Login user with OTP flow
    async login(email, password, otp = null) {
      try {
        if (!otp) {
          // Step 1: Request OTP
          const response = await apiClient.post('/api/auth/request-login-otp', {
            email: email,
            password: password
          });
          return response;
        } else {
          // Step 2: Verify OTP
          const response = await apiClient.post('/api/auth/verify-login-otp', {
            email: email,
            otp: otp
          });
          if (response.success) {
            this.currentUser = response.user;
            return { success: true, message: 'Login successful!', user: response.user };
          }
          return response;
        }
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

    // Get current logged-in user from server (always fetch fresh)
    async getCurrentUser() {
      try {
        const response = await apiClient.get('/api/auth/me');
        if (response.success) {
          this.currentUser = response.user;
          return response.user;
        }
        this.currentUser = null;
        return null;
      } catch (error) {
        this.currentUser = null;
        return null;
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

    // Google Sign-In (no OTP)
    async googleSignIn(credential) {
      // This method intentionally skips OTP and directly calls backend
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

      let photoUrl = currentUser.profilePhoto;
      // If it's a relative path (from backend uploads), prepend API URL
      if (photoUrl.startsWith('/') && window.API_CONFIG && window.API_CONFIG.BASE_URL) {
        photoUrl = window.API_CONFIG.BASE_URL + photoUrl;
      }

      // Update all profile images on the page
      const headerProfileImgs = document.querySelectorAll('.header-actions img, header img[alt*="Profile"], header img[alt*="User"]');
      headerProfileImgs.forEach(img => {
        img.src = photoUrl;
      });
    }

    // Update profile and reload photo everywhere after update
    async updateProfile(data) {
      try {
        const response = await apiClient.put('/api/auth/profile', data);
        if (response.success) {
          this.currentUser = response.user;
          await this.loadProfilePhoto();
          return response;
        }
        return response;
      } catch (error) {
        return { success: false, message: error.message || 'Error updating profile.' };
      }
    }
  }

  // Create global instance
  window.authManager = new AuthManager();

  console.log('✅ Auth system initialized (database-driven, no localStorage)');
})();
