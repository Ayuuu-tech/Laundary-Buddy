// loading-manager.js - Loading indicators and overlays utility
(function() {
  'use strict';

  class LoadingManager {
    constructor() {
      this.overlay = null;
      this.loadingBar = null;
      this.init();
    }

    /**
     * Initialize loading overlay and bar
     */
    init() {
      // Create loading overlay if it doesn't exist
      if (!document.querySelector('.loading-overlay')) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-overlay';
        this.overlay.innerHTML = `
          <div class="loading-container">
            <div class="spinner"></div>
            <div class="loading-text">Loading<span class="loading-dots"></span></div>
          </div>
        `;
        document.body.appendChild(this.overlay);
      } else {
        this.overlay = document.querySelector('.loading-overlay');
      }

      // Create loading bar if it doesn't exist
      if (!document.querySelector('.loading-bar')) {
        this.loadingBar = document.createElement('div');
        this.loadingBar.className = 'loading-bar';
        this.loadingBar.innerHTML = '<div class="loading-bar-progress"></div>';
        document.body.appendChild(this.loadingBar);
      } else {
        this.loadingBar = document.querySelector('.loading-bar');
      }
    }

    /**
     * Show loading overlay with custom message
     * @param {string} message - Loading message
     */
    show(message = 'Loading') {
      if (!this.overlay) this.init();
      
      const textElement = this.overlay.querySelector('.loading-text');
      if (textElement) {
        textElement.innerHTML = `${message}<span class="loading-dots"></span>`;
      }
      
      this.overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    /**
     * Hide loading overlay
     */
    hide() {
      if (!this.overlay) return;
      
      this.overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    /**
     * Show loading bar at top of page
     */
    showBar() {
      if (!this.loadingBar) this.init();
      this.loadingBar.classList.add('show');
    }

    /**
     * Hide loading bar
     */
    hideBar() {
      if (!this.loadingBar) return;
      this.loadingBar.classList.remove('show');
    }

    /**
     * Show loading state on a button
     * @param {HTMLElement} button - Button element
     * @param {string} originalText - Original button text (optional)
     */
    buttonLoading(button, originalText = null) {
      if (!button) return;

      // Store original text if not provided
      if (!originalText) {
        button.dataset.originalText = button.innerHTML;
      } else {
        button.dataset.originalText = originalText;
      }

      button.classList.add('btn-loading');
      button.disabled = true;
    }

    /**
     * Remove loading state from button
     * @param {HTMLElement} button - Button element
     */
    buttonLoaded(button) {
      if (!button) return;

      button.classList.remove('btn-loading');
      button.disabled = false;

      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }

    /**
     * Show inline spinner
     * @param {HTMLElement} element - Container element
     * @param {string} size - 'small', 'medium', or 'large'
     * @param {string} color - Spinner color class
     */
    showSpinner(element, size = 'medium', color = 'primary') {
      if (!element) return;

      const spinner = document.createElement('div');
      spinner.className = `spinner ${size} ${color}`;
      spinner.dataset.loadingSpinner = 'true';
      
      element.appendChild(spinner);
      return spinner;
    }

    /**
     * Remove spinner from element
     * @param {HTMLElement} element - Container element
     */
    removeSpinner(element) {
      if (!element) return;

      const spinner = element.querySelector('[data-loading-spinner="true"]');
      if (spinner) {
        spinner.remove();
      }
    }

    /**
     * Create skeleton loading for content
     * @param {HTMLElement} container - Container element
     * @param {string} type - 'text', 'title', 'avatar', or 'card'
     * @param {number} count - Number of skeleton items
     */
    showSkeleton(container, type = 'text', count = 3) {
      if (!container) return;

      container.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton ${type}`;
        container.appendChild(skeleton);
      }
    }

    /**
     * Wrap async function with loading indicator
     * @param {Function} asyncFn - Async function to wrap
     * @param {string} message - Loading message
     * @returns {Function} - Wrapped function
     */
    wrap(asyncFn, message = 'Loading') {
      return async (...args) => {
        this.show(message);
        try {
          const result = await asyncFn(...args);
          return result;
        } finally {
          this.hide();
        }
      };
    }

    /**
     * Simulate loading progress (useful for file uploads, etc.)
     * @param {Function} callback - Callback function with progress (0-100)
     * @param {number} duration - Duration in milliseconds
     */
    async simulateProgress(callback, duration = 2000) {
      const steps = 20;
      const stepDuration = duration / steps;

      for (let i = 0; i <= steps; i++) {
        const progress = (i / steps) * 100;
        callback(progress);
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }

    /**
     * Show loading state for specific element
     * @param {HTMLElement} element - Element to show loading on
     */
    elementLoading(element) {
      if (!element) return;

      element.classList.add('is-loading');
      element.dataset.originalOpacity = element.style.opacity;
    }

    /**
     * Remove loading state from element
     * @param {HTMLElement} element - Element to remove loading from
     */
    elementLoaded(element) {
      if (!element) return;

      element.classList.remove('is-loading');
      if (element.dataset.originalOpacity) {
        element.style.opacity = element.dataset.originalOpacity;
        delete element.dataset.originalOpacity;
      }
    }

    /**
     * Create a promise that resolves after minimum time
     * Useful to ensure loading indicators are visible long enough
     * @param {Promise} promise - Promise to wait for
     * @param {number} minTime - Minimum time in milliseconds
     * @returns {Promise} - Promise that resolves after both conditions
     */
    async withMinimumDuration(promise, minTime = 500) {
      const start = Date.now();
      const result = await promise;
      const elapsed = Date.now() - start;
      
      if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
      }
      
      return result;
    }
  }

  // Create global instance
  window.loadingManager = new LoadingManager();

  // Defensive: ensure overlay is hidden on page show/navigation restore
  window.addEventListener('pageshow', () => {
    try { window.loadingManager.hide(); } catch (_) {}
  });

  // Defensive: also hide if page becomes visible again (after reload/back-forward cache)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      try { window.loadingManager.hide(); } catch (_) {}
    }
  });

  // Helper functions for common patterns
  window.showLoading = (message) => window.loadingManager.show(message);
  window.hideLoading = () => window.loadingManager.hide();
  window.showLoadingBar = () => window.loadingManager.showBar();
  window.hideLoadingBar = () => window.loadingManager.hideBar();

})();
