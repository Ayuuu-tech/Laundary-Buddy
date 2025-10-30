(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Already logged in?
    if (window.laundryAuthManager && window.laundryAuthManager.isLoggedIn()) {
      window.location.href = 'laundry-dashboard.html';
      return;
    }

    const form = document.querySelector('form');
    const emailInput = document.getElementById('laundryEmail');
    const passwordInput = document.getElementById('laundryPassword');

    if (!form) return;

    const validator = new FormValidator(form, {
      validateOnBlur: true,
      validateOnInput: false,
      showInlineErrors: true,
      showSuccessStates: false
    });

    validator.addRule('laundryEmail', [
      { type: 'required', message: 'Email or Employee ID is required' }
    ]);
    validator.addRule('laundryPassword', [
      { type: 'required', message: 'Password is required' },
      { type: 'minLength', value: 6, message: 'Password must be at least 6 characters' }
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validator.validateForm()) return;

      const emailOrId = emailInput.value.trim();
      const password = passwordInput.value.trim();

      const btn = form.querySelector('button[type="submit"]');
      if (window.loadingManager) {
        window.loadingManager.buttonLoading(btn);
        window.loadingManager.show('Logging in');
      }

      try {
        const res = await window.laundryAuthManager.login(emailOrId, password);
        if (res.success) {
          if (window.toastManager) {
            window.toastManager.show(`Welcome, ${res.user.name}!`, 'success', 'Login Successful');
          }
          setTimeout(() => { window.location.href = 'laundry-dashboard.html'; }, 1200);
        } else {
          if (window.toastManager) {
            window.toastManager.show(res.message, 'error', 'Login Failed');
          }
          passwordInput.value = '';
          passwordInput.focus();
        }
      } catch (err) {
        console.error(err);
        if (window.toastManager) {
          window.toastManager.show('Unexpected error, please try again.', 'error', 'Error');
        }
      } finally {
        if (window.loadingManager) {
          window.loadingManager.hide();
          window.loadingManager.buttonLoaded(btn);
        }
      }
    });
  });
})();
