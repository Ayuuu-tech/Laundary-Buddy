// google-auth.js - Google OAuth integration
(function () {
  'use strict';

  // Google Client ID from Google Cloud Console (read from central env config when available)
  const GOOGLE_CLIENT_ID = (window.ENV_CONFIG && window.ENV_CONFIG.config && window.ENV_CONFIG.config.googleClientId)
    || '708319771344-gd8frork6c2r8o45rbkfctpk9nl8shdb.apps.googleusercontent.com';

  class GoogleAuth {
    constructor() {
      this.initialized = false;
      this.init();
    }

    init() {
      // Wait for Google API to load
      if (typeof google !== 'undefined' && google.accounts) {
        this.initializeGoogleSignIn();
      } else {
        // Retry after a short delay
        setTimeout(() => this.init(), 100);
      }
    }

    initializeGoogleSignIn() {
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true
        });

        this.initialized = true;
        this.attachClickHandlers();
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    }

    attachClickHandlers() {
      const googleBtns = document.querySelectorAll('#google-signin-btn, .google-btn');
      googleBtns.forEach(btn => {
        btn.addEventListener('click', () => this.triggerGoogleSignIn());
      });
    }

    triggerGoogleSignIn() {
      if (!this.initialized) {
        if (window.toastManager) {
          window.toastManager.error('Google Sign-In not ready. Please try again.', 'Error');
        }
        return;
      }

      // Show Google One Tap prompt
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          // One Tap not displayed, show popup instead
          this.showGooglePopup();
        } else if (notification.isSkippedMoment()) {
          // User skipped, show popup
          this.showGooglePopup();
        }
      });
    }

    showGooglePopup() {
      // Render a button and click it programmatically
      const tempDiv = document.createElement('div');
      tempDiv.id = 'google-temp-btn';
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);

      google.accounts.id.renderButton(tempDiv, {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        click_listener: () => { }
      });

      // Click the button
      const btn = tempDiv.querySelector('div[role="button"]');
      if (btn) btn.click();

      // Remove temp div after a delay
      setTimeout(() => tempDiv.remove(), 1000);
    }

    async handleCredentialResponse(response) {
      if (window.loadingManager) {
        window.loadingManager.show('Signing in with Google...');
      }

      try {
        const result = await this.authenticateWithBackend(response.credential);

        if (result.success) {
          // Session is now stored server-side automatically
          if (window.authManager) {
            window.authManager.currentUser = result.user;
          }

          if (window.toastManager) {
            const message = result.isNewUser
              ? `Welcome to Laundry Buddy, ${result.user.name}!`
              : `Welcome back, ${result.user.name}!`;
            window.toastManager.success(message, result.isNewUser ? 'Account Created!' : 'Login Successful');
          }

          // Redirect to home page
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 1500);
        } else {
          if (window.toastManager) {
            window.toastManager.error(result.message || 'Google sign-in failed', 'Error');
          }
        }
      } catch (error) {
        console.error('Google auth error:', error);
        if (window.toastManager) {
          window.toastManager.error('Failed to sign in with Google. Please try again.', 'Error');
        }
      } finally {
        if (window.loadingManager) {
          window.loadingManager.hide();
        }
      }
    }

    async authenticateWithBackend(credential) {
      // Use the same logic as api-config.js to always use production API URL unless on localhost
      const apiUrl = (window.API_CONFIG && window.API_CONFIG.BASE_URL) ||
        (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://api.ayushmaanyadav.me');

      const response = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential })
      });

      return await response.json();
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.googleAuth = new GoogleAuth();
  });
})();
