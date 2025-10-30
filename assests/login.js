// login.js - Login page form validation with authentication
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Ensure any stray global loading overlays are hidden when page loads
    if (window.loadingManager) {
      try { window.loadingManager.hide(); } catch (_) {}
    }

    // Check if user is already logged in
    if (window.authManager && window.authManager.isLoggedIn()) {
      if (window.toastManager) {
        window.toastManager.info('You are already logged in. Redirecting...');
      }
      window.location.href = 'home.html';
      return;
    }

    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (loginForm && emailInput && passwordInput) {
      // Initialize form validator
      const validator = new FormValidator(loginForm, {
        validateOnBlur: true,
        validateOnInput: false,
        showInlineErrors: true,
        showSuccessStates: false
      });

      // Add validation rules
      validator.addRule('email', [
        { type: 'required', message: 'Student ID or email is required' }
      ]);

      validator.addRule('password', [
        { type: 'required', message: 'Password is required' },
        { type: 'minLength', value: 6, message: 'Password must be at least 6 characters' }
      ]);

      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form
        if (!validator.validateForm()) {
          return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (window.loadingManager) {
          window.loadingManager.buttonLoading(submitButton);
          window.loadingManager.show('Logging in');
        }

        try {
          // Attempt login using auth system
          if (window.authManager) {
            const result = await window.authManager.login(email, password);

            if (result.success) {
              // Use toast notification instead of alert
              if (window.toastManager) {
                window.toastManager.show(`Welcome back, ${result.user.name}!`, 'success', 'Login Successful');
              } else {
                alert(result.message + ' Welcome, ' + result.user.name + '!');
              }
              console.log('User logged in:', result.user);
              
              // Redirect to home page
              setTimeout(() => {
                window.location.href = 'home.html';
              }, 1500);
            } else {
              // Use toast for error
              if (window.toastManager) {
                window.toastManager.show(result.message, 'error', 'Login Failed');
              } else {
                alert(result.message);
              }
              passwordInput.value = '';
              passwordInput.focus();
            }
          } else {
            if (window.toastManager) {
              window.toastManager.show('Please refresh the page and try again.', 'error', 'System Error');
            } else {
              alert('Authentication system not loaded. Please refresh the page.');
            }
          }
        } catch (error) {
          console.error('Login error:', error);
          if (window.toastManager) {
            window.toastManager.show('An unexpected error occurred. Please try again.', 'error', 'Error');
          } else {
            alert('An error occurred during login. Please try again.');
          }
        } finally {
          // Hide loading state
          if (window.loadingManager) {
            window.loadingManager.hide();
            window.loadingManager.buttonLoaded(submitButton);
          }
        }
      });

      // Visual feedback on password input
      passwordInput.addEventListener('input', function () {
        if (this.value.length > 0) {
          this.style.borderColor = '#4CAF50';
        } else {
          this.style.borderColor = '';
        }
      });
    }

    console.log('Login page loaded');
  });
})();

