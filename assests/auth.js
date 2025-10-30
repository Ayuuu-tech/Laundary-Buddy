// auth.js - Authentication utility for managing user sessions
(function () {
  'use strict';

  // Authentication Manager Class
  class AuthManager {
    constructor() {
      this.storageKey = 'laundryBuddy_users';
      this.currentUserKey = 'laundryBuddy_currentUser';
    }

    // Register a new user
    async signup(userData) {
      try {
        const users = this.getAllUsers();
        
        // Check if user already exists
        const existingUser = users.find(u => u.studentId === userData.studentId);
        if (existingUser) {
          return { success: false, message: 'Student ID already registered!' };
        }

        // Check if email already exists
        const existingEmail = users.find(u => u.email === userData.email);
        if (existingEmail) {
          return { success: false, message: 'Email already registered!' };
        }

        // Hash the password using CryptoUtils
        const hashedPassword = await window.CryptoUtils.hashPassword(userData.password);

        // Add new user
        const newUser = {
          id: this.generateUserId(),
          name: userData.name,
          studentId: userData.studentId,
          hostelRoom: userData.hostelRoom,
          email: userData.email || `${userData.studentId}@bmu.edu.in`,
          password: hashedPassword, // Store hashed password
          phone: userData.phone || '',
          laundryPreferences: userData.preferences || 'Standard detergent',
          profilePhoto: userData.profilePhoto || null, // Profile photo data
          registeredDate: new Date().toISOString(),
          orders: []
        };

        users.push(newUser);
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        // Auto login after signup
        await this.login(newUser.studentId, userData.password); // Use original password for login

        return { success: true, message: 'Account created successfully!', user: newUser };
      } catch (error) {
        console.error('Signup error:', error);
        return { success: false, message: 'Error creating account. Please try again.' };
      }
    }

    // Login user
    async login(studentIdOrEmail, password) {
      try {
        const users = this.getAllUsers();
        
        // Find user by student ID or email
        const user = users.find(u => 
          u.studentId === studentIdOrEmail || u.email === studentIdOrEmail
        );

        if (!user) {
          return { success: false, message: 'Invalid Student ID/Email or Password!' };
        }

        // Verify password using CryptoUtils
        const isPasswordValid = await window.CryptoUtils.verifyPassword(password, user.password);
        
        if (!isPasswordValid) {
          return { success: false, message: 'Invalid Student ID/Email or Password!' };
        }

        // Store current user session
        const sessionData = {
          id: user.id,
          name: user.name,
          studentId: user.studentId,
          email: user.email,
          hostelRoom: user.hostelRoom,
          phone: user.phone,
          laundryPreferences: user.laundryPreferences,
          profilePhoto: user.profilePhoto || null,
          loginTime: new Date().toISOString()
        };

        localStorage.setItem(this.currentUserKey, JSON.stringify(sessionData));

        return { success: true, message: 'Login successful!', user: sessionData };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Error logging in. Please try again.' };
      }
    }

    // Logout user
    logout() {
      localStorage.removeItem(this.currentUserKey);
      window.location.href = 'index.html';
    }

    // Check if user is logged in
    isLoggedIn() {
      const currentUser = localStorage.getItem(this.currentUserKey);
      return currentUser !== null;
    }

    // Get current logged-in user
    getCurrentUser() {
      const userData = localStorage.getItem(this.currentUserKey);
      return userData ? JSON.parse(userData) : null;
    }

    // Get all registered users
    getAllUsers() {
      const usersData = localStorage.getItem(this.storageKey);
      return usersData ? JSON.parse(usersData) : [];
    }

    // Update current user profile
    updateProfile(updatedData) {
      try {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          return { success: false, message: 'No user logged in!' };
        }

        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (userIndex === -1) {
          return { success: false, message: 'User not found!' };
        }

        // Update user data
        users[userIndex] = { ...users[userIndex], ...updatedData };
        localStorage.setItem(this.storageKey, JSON.stringify(users));

        // Update current session
        const updatedSession = { ...currentUser, ...updatedData };
        localStorage.setItem(this.currentUserKey, JSON.stringify(updatedSession));

        return { success: true, message: 'Profile updated successfully!', user: updatedSession };
      } catch (error) {
        console.error('Update error:', error);
        return { success: false, message: 'Error updating profile.' };
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

    // Initialize with demo users (for testing)
    // Initialize demo users for testing
    async initializeDemoUsers() {
      const users = this.getAllUsers();
      if (users.length === 0) {
        // Hash the demo password
        const hashedPassword = await window.CryptoUtils.hashPassword('123456');
        
        const demoUsers = [
          {
            id: 'USER_DEMO_1',
            name: 'Demo User',
            studentId: 'STU123456',
            hostelRoom: 'BH-3, A-404',
            email: 'demo@bmu.edu.in',
            password: hashedPassword, // Store hashed password
            phone: '9876543210',
            laundryPreferences: 'Hypoallergenic detergent',
            registeredDate: new Date().toISOString(),
            orders: []
          }
        ];
        localStorage.setItem(this.storageKey, JSON.stringify(demoUsers));
        console.log('Demo user initialized. Login with: STU123456 or demo@bmu.edu.in / Password: 123456');
      }
    }
  }

  // Create global instance
  window.authManager = new AuthManager();

  // Initialize demo users on first load (async)
  // Wait for CryptoUtils to be available
  async function initializeDemoUsersWhenReady() {
    // Wait for CryptoUtils to be available
    let attempts = 0;
    while (!window.CryptoUtils && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.CryptoUtils) {
      const existingUsers = localStorage.getItem('laundryBuddy_users');
      if (!existingUsers || existingUsers === '[]' || JSON.parse(existingUsers).length === 0) {
        await window.authManager.initializeDemoUsers();
        console.log('✅ Demo user created successfully!');
      } else {
        console.log('✅ Users already exist in database');
      }
    } else {
      console.error('❌ CryptoUtils not loaded. Demo users not initialized.');
    }
  }
  
  // Call initialization
  initializeDemoUsersWhenReady();

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
