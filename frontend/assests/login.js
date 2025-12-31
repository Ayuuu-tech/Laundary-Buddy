// login.js - Login page form validation with authentication
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    // Ensure any stray global loading overlays are hidden when page loads
    if (window.loadingManager) {
      try { window.loadingManager.hide(); } catch (_) {}
    }

    // Check if user is already logged in
    if (window.authManager) {
      const isLoggedIn = await window.authManager.isLoggedIn();
      if (isLoggedIn) {
        if (window.toastManager) {
          window.toastManager.info('You are already logged in. Redirecting...');
        }
        window.location.href = 'home.html';
        return;
      }
    }

    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const otpInput = document.getElementById('otp');

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


      // OTP login flow
      let otpStep = false;
      let lastEmail = '';
      let lastPassword = '';

      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form
        if (!validator.validateForm()) {
          return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const submitButton = loginForm.querySelector('button[type="submit"]');

        if (!otpStep) {
          // Step 1: Request OTP
          if (window.loadingManager) {
            window.loadingManager.buttonLoading(submitButton);
            window.loadingManager.show('Requesting OTP');
          }
          try {
            const result = await window.authManager.login(email, password);
            if (result.success) {
              otpStep = true;
              lastEmail = email;
              lastPassword = password;
              // Show OTP input group
              const otpGroup = document.getElementById('otp-group');
              if (otpGroup) otpGroup.style.display = 'block';
              otpInput.value = '';
              submitButton.textContent = 'Verify OTP';
              if (window.toastManager) {
                window.toastManager.info('OTP sent to your email. Please enter it to continue.', 'OTP Sent');
              }
              passwordInput.disabled = true;
              emailInput.disabled = true;
              otpInput.focus();
            } else {
              if (window.toastManager) {
                window.toastManager.error(result.message, 'Login Failed');
              } else {
                alert(result.message);
              }
              passwordInput.value = '';
              passwordInput.focus();
            }
          } finally {
            if (window.loadingManager) {
              window.loadingManager.hide();
              window.loadingManager.buttonLoaded(submitButton);
            }
          }
        } else {
          // Step 2: Verify OTP
          const otp = otpInput.value.trim();
          if (!otp || otp.length !== 6) {
            if (window.toastManager) {
              window.toastManager.error('Please enter the 6-digit OTP sent to your email.', 'OTP Required');
            }
            return;
          }
          if (window.loadingManager) {
            window.loadingManager.buttonLoading(submitButton);
            window.loadingManager.show('Verifying OTP');
          }
          try {
            const result = await window.authManager.login(lastEmail, lastPassword, otp);
            if (result.success) {
              if (window.toastManager) {
                window.toastManager.success(`Welcome back, ${result.user.name}!`, 'Login Successful');
              } else {
                alert(result.message + ' Welcome, ' + result.user.name + '!');
              }
              setTimeout(() => {
                window.location.href = 'home.html';
              }, 1500);
            } else {
              if (window.toastManager) {
                window.toastManager.error(result.message, 'OTP Failed');
              } else {
                alert(result.message);
              }
              otpInput.value = '';
              otpInput.focus();
            }
          } finally {
            if (window.loadingManager) {
              window.loadingManager.hide();
              window.loadingManager.buttonLoaded(submitButton);
            }
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

