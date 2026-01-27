/**
 * PWA INSTALLER
 * 
 * Progressive Web App registration and installation manager.
 * Handles service worker registration, update detection, and install prompts.
 * 
 * Features:
 * - Service worker registration
 * - Update detection and notification
 * - Install prompt handling
 * - Installation banner
 * - Offline/online detection
 * 
 * Usage:
 * Include this script in all HTML pages before other scripts:
 * <script src="assests/pwa-installer.js"></script>
 * 
 * Created: 2025
 * Part of: Laundry Buddy College Project
 */

(function () {
  'use strict';

  /**
   * PWAInstaller Class
   */
  class PWAInstaller {
    constructor() {
      this.deferredPrompt = null;
      this.isInstalled = false;
      this.updateAvailable = false;
    }

    /**
     * Initialize PWA features
     */
    init() {
      // Register service worker
      this.registerServiceWorker();

      // Setup install prompt
      this.setupInstallPrompt();

      // Setup online/offline detection
      this.setupOnlineOfflineDetection();

      // Check if already installed
      this.checkIfInstalled();

      console.log('✓ PWA Installer initialized');
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });

        console.log('✓ Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Update available!');
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        });

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    /**
     * Setup install prompt
     */
    setupInstallPrompt() {
      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('Install prompt triggered');
        
        // Prevent default Chrome install prompt
        e.preventDefault();
        
        // Save the event for later use
        this.deferredPrompt = e;

        // Show custom install banner
        this.showInstallBanner();
      });

      // Detect successful installation
      window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        this.isInstalled = true;
        this.hideInstallBanner();
        
        // Show success message
        if (window.toastManager) {
          window.toastManager.success('Laundry Buddy installed!');
        } else if (window.successToast) {
          window.successToast('Laundry Buddy installed!');
        }
      });
    }

    /**
     * Show install banner
     */
    showInstallBanner() {
      // Check if banner already exists
      if (document.getElementById('pwa-install-banner')) {
        return;
      }

      // Don't show if already dismissed recently
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
        return; // Dismissed within last 7 days
      }

      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">📱</div>
          <div class="pwa-banner-text">
            <strong>Install Laundry Buddy</strong>
            <span>Get quick access and offline features</span>
          </div>
          <button class="pwa-install-btn" id="pwa-install-btn">Install</button>
          <button class="pwa-dismiss-btn" id="pwa-dismiss-btn">&times;</button>
        </div>
      `;

      document.body.appendChild(banner);

      // Add styles
      this.addBannerStyles();

      // Add event listeners
      document.getElementById('pwa-install-btn').addEventListener('click', () => {
        this.promptInstall();
      });

      document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        this.dismissInstallBanner();
      });

      // Show banner with animation
      setTimeout(() => {
        banner.classList.add('show');
      }, 1000);
    }

    /**
     * Hide install banner
     */
    hideInstallBanner() {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.classList.remove('show');
        setTimeout(() => {
          banner.remove();
        }, 300);
      }
    }

    /**
     * Dismiss install banner
     */
    dismissInstallBanner() {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      this.hideInstallBanner();
    }

    /**
     * Prompt install
     */
    async promptInstall() {
      if (!this.deferredPrompt) {
        console.log('No install prompt available');
        return;
      }

      // Show install prompt
      this.deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`Install prompt outcome: ${outcome}`);

      if (outcome === 'accepted') {
        this.hideInstallBanner();
      }

      // Clear the prompt
      this.deferredPrompt = null;
    }

    /**
     * Add banner styles
     */
    addBannerStyles() {
      if (document.getElementById('pwa-banner-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'pwa-banner-styles';
      style.textContent = `
        .pwa-install-banner {
          position: fixed;
          bottom: -200px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 12px 12px 0 0;
          padding: 16px 20px;
          width: 100%;
          max-width: 500px;
          z-index: 9999;
          transition: bottom 0.3s ease;
        }

        .pwa-install-banner.show {
          bottom: 0;
        }

        .pwa-banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pwa-banner-icon {
          font-size: 32px;
        }

        .pwa-banner-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pwa-banner-text strong {
          font-size: 16px;
          color: var(--text-color, #1f2937);
        }

        .pwa-banner-text span {
          font-size: 13px;
          color: var(--text-light, #6b7280);
        }

        .pwa-install-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          transition: transform 0.2s;
        }

        .pwa-install-btn:hover {
          transform: scale(1.05);
        }

        .pwa-dismiss-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-light, #6b7280);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .pwa-dismiss-btn:hover {
          background-color: var(--background-color, #f9fafb);
          color: var(--text-color, #1f2937);
        }

        body.dark-theme .pwa-install-banner {
          background: var(--background-secondary, #1e293b);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 768px) {
          .pwa-install-banner {
            max-width: 100%;
            border-radius: 0;
          }

          .pwa-banner-text span {
            display: none;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
      if (window.toastManager && window.toastManager.show) {
        window.toastManager.show({
          type: 'info',
          title: 'Update available',
          message: 'Refresh to get the latest version',
          duration: 0,
          action: {
            text: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      } else if (window.infoToast) {
        window.infoToast('Update available! Please refresh.');
      } else {
        // Fallback
        if (confirm('A new version is available. Refresh now?')) {
          window.location.reload();
        }
      }
    }

    /**
     * Setup online/offline detection
     */
    setupOnlineOfflineDetection() {
      window.addEventListener('online', () => {
        console.log('Back online');
        if (window.successToast) window.successToast('Connection restored');

        // Update UI
        this.updateOnlineStatus(true);
      });

      window.addEventListener('offline', () => {
        console.log('Gone offline');
        if (window.warningToast) window.warningToast('You are offline');

        // Update UI
        this.updateOnlineStatus(false);
      });

      // Initial status
      this.updateOnlineStatus(navigator.onLine);
    }

    /**
     * Update online status indicator
     */
    updateOnlineStatus(isOnline) {
      // Add/remove offline class to body
      if (isOnline) {
        document.body.classList.remove('offline');
      } else {
        document.body.classList.add('offline');
      }
    }

    /**
     * Check if already installed
     */
    checkIfInstalled() {
      // Check if running as installed PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');

      if (isStandalone) {
        this.isInstalled = true;
        console.log('Running as installed PWA');
      }
    }
  }

  // Initialize PWA Installer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      const pwaInstaller = new PWAInstaller();
      pwaInstaller.init();
      window.pwaInstaller = pwaInstaller;
    });
  } else {
    const pwaInstaller = new PWAInstaller();
    pwaInstaller.init();
    window.pwaInstaller = pwaInstaller;
  }

  // Export for use in modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAInstaller;
  }
})();
