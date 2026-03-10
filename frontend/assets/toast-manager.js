// toast-manager.js - Modern toast notification system
(function() {
  'use strict';

  class ToastManager {
    constructor(options = {}) {
      this.options = {
        position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
        duration: 4000, // milliseconds
        showProgress: true,
        pauseOnHover: true,
        maxToasts: 5,
        ...options
      };
      this.toasts = [];
      this.container = null;
      this.init();
    }

    /**
     * Initialize toast container
     */
    init() {
      if (!document.querySelector('.toast-container')) {
        this.container = document.createElement('div');
        this.container.className = `toast-container ${this.options.position}`;
        document.body.appendChild(this.container);
      } else {
        this.container = document.querySelector('.toast-container');
      }
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @returns {string} - Toast ID
     */
    show(options = {}) {
      const toast = {
        id: this.generateId(),
        type: options.type || 'info', // success, error, warning, info
        title: options.title || '',
        message: options.message || '',
        duration: options.duration !== undefined ? options.duration : this.options.duration,
        showProgress: options.showProgress !== undefined ? options.showProgress : this.options.showProgress,
        action: options.action || null,
        onClose: options.onClose || null,
        pauseOnHover: options.pauseOnHover !== undefined ? options.pauseOnHover : this.options.pauseOnHover
      };

      // Check max toasts limit
      if (this.toasts.length >= this.options.maxToasts) {
        this.dismiss(this.toasts[0].id);
      }

      this.toasts.push(toast);
      this.render(toast);
      
      return toast.id;
    }

    /**
     * Show success toast
     * @param {string} message - Toast message
     * @param {string} title - Toast title (optional)
     * @returns {string} - Toast ID
     */
    success(message, title = 'Success') {
      return this.show({
        type: 'success',
        title: title,
        message: message
      });
    }

    /**
     * Show error toast
     * @param {string} message - Toast message
     * @param {string} title - Toast title (optional)
     * @returns {string} - Toast ID
     */
    error(message, title = 'Error') {
      return this.show({
        type: 'error',
        title: title,
        message: message,
        duration: 6000 // Errors show longer
      });
    }

    /**
     * Show warning toast
     * @param {string} message - Toast message
     * @param {string} title - Toast title (optional)
     * @returns {string} - Toast ID
     */
    warning(message, title = 'Warning') {
      return this.show({
        type: 'warning',
        title: title,
        message: message
      });
    }

    /**
     * Show info toast
     * @param {string} message - Toast message
     * @param {string} title - Toast title (optional)
     * @returns {string} - Toast ID
     */
    info(message, title = '') {
      return this.show({
        type: 'info',
        title: title,
        message: message
      });
    }

    /**
     * Render toast element
     * @param {Object} toast - Toast object
     */
    render(toast) {
      const toastEl = document.createElement('div');
      toastEl.className = `toast ${toast.type}`;
      toastEl.dataset.toastId = toast.id;

      // Icon based on type
      const icons = {
        success: 'bx-check-circle',
        error: 'bx-x-circle',
        warning: 'bx-error-circle',
        info: 'bx-info-circle'
      };

      let html = `
        <i class='bx ${icons[toast.type]} toast-icon'></i>
        <div class="toast-content">
          ${toast.title ? `<div class="toast-title">${toast.title}</div>` : ''}
          <div class="toast-message">${toast.message}</div>
        </div>
      `;

      // Add action button if provided
      if (toast.action) {
        html += `<button class="toast-action">${toast.action.text}</button>`;
      }

      // Add close button
      html += `<button class="toast-close" aria-label="Close">&times;</button>`;

      // Add progress bar
      if (toast.showProgress && toast.duration > 0) {
        html += `<div class="toast-progress"></div>`;
      }

      toastEl.innerHTML = html;

      // Event listeners
      const closeBtn = toastEl.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.dismiss(toast.id));

      if (toast.action) {
        const actionBtn = toastEl.querySelector('.toast-action');
        actionBtn.addEventListener('click', () => {
          toast.action.onClick();
          this.dismiss(toast.id);
        });
      }

      // Pause on hover
      if (toast.pauseOnHover && toast.duration > 0) {
        let timeoutId;
        let remainingTime = toast.duration;
        let startTime;

        const startTimer = () => {
          startTime = Date.now();
          timeoutId = setTimeout(() => this.dismiss(toast.id), remainingTime);
          
          if (toast.showProgress) {
            const progressBar = toastEl.querySelector('.toast-progress');
            progressBar.style.animation = `progressBar ${remainingTime}ms linear forwards`;
          }
        };

        const pauseTimer = () => {
          clearTimeout(timeoutId);
          remainingTime -= Date.now() - startTime;
          
          if (toast.showProgress) {
            const progressBar = toastEl.querySelector('.toast-progress');
            progressBar.style.animationPlayState = 'paused';
          }
        };

        toastEl.addEventListener('mouseenter', pauseTimer);
        toastEl.addEventListener('mouseleave', startTimer);

        startTimer();
      } else if (toast.duration > 0) {
        setTimeout(() => this.dismiss(toast.id), toast.duration);
        
        if (toast.showProgress) {
          const progressBar = toastEl.querySelector('.toast-progress');
          progressBar.style.animation = `progressBar ${toast.duration}ms linear forwards`;
        }
      }

      // Add to container
      this.container.appendChild(toastEl);
    }

    /**
     * Dismiss a toast
     * @param {string} toastId - Toast ID
     */
    dismiss(toastId) {
      const toastEl = this.container.querySelector(`[data-toast-id="${toastId}"]`);
      if (!toastEl) return;

      toastEl.classList.add('dismissing');

      setTimeout(() => {
        toastEl.remove();
        
        // Remove from array
        const index = this.toasts.findIndex(t => t.id === toastId);
        if (index > -1) {
          const toast = this.toasts[index];
          if (toast.onClose) {
            toast.onClose();
          }
          this.toasts.splice(index, 1);
        }
      }, 300);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
      const toastIds = [...this.toasts.map(t => t.id)];
      toastIds.forEach(id => this.dismiss(id));
    }

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
      return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Change toast position
     * @param {string} position - New position
     */
    setPosition(position) {
      this.options.position = position;
      if (this.container) {
        this.container.className = `toast-container ${position}`;
      }
    }

    /**
     * Prompt-style toast (replacement for confirm dialog)
     * @param {Object} options - Prompt options
     * @returns {Promise} - Promise that resolves with user action
     */
    async confirm(options = {}) {
      return new Promise((resolve) => {
        const toastId = this.show({
          type: options.type || 'warning',
          title: options.title || 'Confirm',
          message: options.message || 'Are you sure?',
          duration: 0, // Don't auto-dismiss
          showProgress: false,
          action: {
            text: options.confirmText || 'Confirm',
            onClick: () => resolve(true)
          }
        });

        // Override close button to resolve false
        const toastEl = this.container.querySelector(`[data-toast-id="${toastId}"]`);
        const closeBtn = toastEl.querySelector('.toast-close');
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          resolve(false);
        });
      });
    }
  }

  // Create global instance
  window.toast = new ToastManager();
  // Back-compat alias for existing code paths
  window.toastManager = window.toast;

  // Helper functions for convenience
  window.showToast = (message, type = 'info', title = '') => window.toast.show({ type, title, message });

  window.successToast = (message, title = 'Success') => window.toast.success(message, title);

  window.errorToast = (message, title = 'Error') => window.toast.error(message, title);

  window.warningToast = (message, title = 'Warning') => window.toast.warning(message, title);

  window.infoToast = (message, title = '') => window.toast.info(message, title);

})();
