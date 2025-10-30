// signup.js - Signup page form validation with authentication
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Check if user is already logged in
    if (window.authManager && window.authManager.isLoggedIn()) {
      window.location.href = 'home.html';
      return;
    }

    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
      const nameInput = document.getElementById('name');
      const roomInput = document.getElementById('room');
      const studentIdInput = document.getElementById('studentId');
      const passwordInput = document.getElementById('signup-password');
      const confirmPasswordInput = document.getElementById('confirm-password');

      // Initialize form validator
      const validator = new FormValidator(signupForm, {
        validateOnBlur: true,
        validateOnInput: true,
        showInlineErrors: true,
        showSuccessStates: true
      });

      // Add validation rules
      validator.addRule('name', [
        { type: 'required', message: 'Name is required' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
      ]);

      validator.addRule('room', [
        { type: 'required', message: 'Hostel/Room number is required' }
      ]);

      validator.addRule('studentId', [
        { type: 'required', message: 'Student ID is required' },
        { type: 'minLength', value: 6, message: 'Student ID must be at least 6 characters' }
      ]);

      validator.addRule('signup-password', [
        { type: 'required', message: 'Password is required' },
        { type: 'minLength', value: 6, message: 'Password must be at least 6 characters' },
        { 
          type: 'custom', 
          validator: (value) => {
            if (window.CryptoUtils) {
              return window.CryptoUtils.validatePasswordStrength(value);
            }
            return { valid: value.length >= 6 };
          }
        }
      ]);

      validator.addRule('confirm-password', [
        { type: 'required', message: 'Please confirm your password' },
        { type: 'match', field: 'signup-password', message: 'Passwords do not match' }
      ]);

      // Show password strength indicator
      if (window.PasswordStrength) {
        PasswordStrength.showIndicator(passwordInput, '#signup-form');
      }

      signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form
        if (!validator.validateForm()) {
          return;
        }

        const name = nameInput.value.trim();
        const room = roomInput.value.trim();
        const studentId = studentIdInput.value.trim();
        const password = passwordInput.value.trim();

        // Show loading state
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (window.loadingManager) {
          window.loadingManager.buttonLoading(submitButton);
          window.loadingManager.show('Creating your account');
        }

        try {
          // Register user using auth system
          if (window.authManager) {
            const result = await window.authManager.signup({
              name: name,
              studentId: studentId,
              hostelRoom: room,
              password: password,
              email: `${studentId}@bmu.edu.in`
            });

            if (result.success) {
              // Use toast notification instead of alert
              if (window.toast) {
                window.toast.success(result.message, 'Account Created!');
              } else {
                alert(result.message + ' Redirecting to home page...');
              }
              console.log('User registered:', result.user);
              
              // Redirect to home page
              setTimeout(() => {
                window.location.href = 'home.html';
              }, 1500);
            } else {
              // Use toast for error
              if (window.toast) {
                window.toast.error(result.message, 'Registration Failed');
              } else {
                alert(result.message);
              }
            }
          } else {
            if (window.toast) {
              window.toast.error('Please refresh the page and try again.', 'System Error');
            } else {
              alert('Authentication system not loaded. Please refresh the page.');
            }
          }
        } catch (error) {
          console.error('Signup error:', error);
          if (window.toast) {
            window.toast.error('An unexpected error occurred. Please try again.', 'Error');
          } else {
            alert('An error occurred during signup. Please try again.');
          }
        } finally {
          // Hide loading state
          if (window.loadingManager) {
            window.loadingManager.hide();
            window.loadingManager.buttonLoaded(submitButton);
          }
        }
      });

      // Real-time password match indicator
      confirmPasswordInput.addEventListener('input', function () {
        if (this.value.length > 0) {
          if (this.value === passwordInput.value) {
            this.style.borderColor = '#4CAF50';
          } else {
            this.style.borderColor = '#f44336';
          }
        } else {
          this.style.borderColor = '';
        }
      });
    }

    console.log('Signup page loaded');
  });
})();

