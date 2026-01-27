// signup.js - Signup page form validation with authentication
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    // Password toggle functionality for both password fields
    const toggleSignupPassword = document.getElementById('toggleSignupPassword');
    const signupPasswordInput = document.getElementById('signup-password');
    
    if (toggleSignupPassword && signupPasswordInput) {
      toggleSignupPassword.addEventListener('click', function() {
        const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupPasswordInput.setAttribute('type', type);
        
        // Toggle icon
        if (type === 'password') {
          toggleSignupPassword.classList.remove('bx-show');
          toggleSignupPassword.classList.add('bx-hide');
        } else {
          toggleSignupPassword.classList.remove('bx-hide');
          toggleSignupPassword.classList.add('bx-show');
        }
      });
    }

    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        
        // Toggle icon
        if (type === 'password') {
          toggleConfirmPassword.classList.remove('bx-show');
          toggleConfirmPassword.classList.add('bx-hide');
        } else {
          toggleConfirmPassword.classList.remove('bx-hide');
          toggleConfirmPassword.classList.add('bx-show');
        }
      });
    }

    // Check if user is already logged in
    try {
      if (window.authManager) {
        const isLoggedIn = await window.authManager.isLoggedIn();
        if (isLoggedIn) {
          window.location.href = 'home.html';
          return;
        }
      }
    } catch (error) {
      console.log('Auth check failed, continuing with signup page:', error);
      // Continue loading signup page even if auth check fails
    }

    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
      const nameInput = document.getElementById('name');
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

      validator.addRule('studentId', [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Please enter a valid email address' }
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

      // OTP signup flow
      let otpStep = false;
      let lastSignupData = null;
      let otpInput = null;

      signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form
        if (!validator.validateForm()) {
          return;
        }

        const name = nameInput.value.trim();
        const email = studentIdInput.value.trim();
        const password = passwordInput.value.trim();
        const submitButton = signupForm.querySelector('button[type="submit"]');

        if (!otpStep) {
          // Step 1: Request OTP
          if (window.loadingManager) {
            window.loadingManager.buttonLoading(submitButton);
            window.loadingManager.show('Requesting OTP');
          }
          try {
            const result = await window.authManager.signup({
              name: name,
              email: email,
              password: password
            });
            if (result.success) {
              otpStep = true;
              lastSignupData = { name, email, password };
              // Show OTP input
              if (!otpInput) {
                otpInput = document.createElement('input');
                otpInput.type = 'text';
                otpInput.id = 'otp';
                otpInput.placeholder = 'Enter OTP';
                otpInput.className = 'form-control';
                otpInput.style.marginTop = '10px';
                otpInput.maxLength = 6;
                signupForm.insertBefore(otpInput, submitButton);
              }
              otpInput.style.display = 'block';
              otpInput.value = '';
              submitButton.textContent = 'Verify OTP';
              if (window.toastManager) {
                window.toastManager.info('OTP sent to your email. Please enter it to continue.', 'OTP Sent');
              }
              nameInput.disabled = true;
              studentIdInput.disabled = true;
              passwordInput.disabled = true;
              confirmPasswordInput.disabled = true;
            } else {
              if (window.toastManager) {
                window.toastManager.error(result.message, 'Registration Failed');
              } else {
                alert(result.message);
              }
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
            const result = await window.authManager.signup(lastSignupData, otp);
            if (result.success) {
              if (window.toastManager) {
                window.toastManager.success(result.message, 'Account Created!');
              } else {
                alert(result.message + ' Redirecting to home page...');
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

