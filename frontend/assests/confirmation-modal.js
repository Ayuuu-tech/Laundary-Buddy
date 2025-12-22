// Deprecated: confirmation-modal script removed from project.
(function() {
  'use strict';
  // Intentionally left blank to avoid runtime side-effects.
})();
/*
            this.hide(false);
          }
        });
      } else {
        this.overlay = document.querySelector('.confirm-modal-overlay');
      }
    }

    /**
     * Show confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>} - Promise that resolves with user's choice
  * /
    async confirm(options = {}) {
      const {
        title = 'Confirm Action',
        message = 'Are you sure?',
        type = 'warning', // warning, danger, info, success
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmType = type, // Type for confirm button styling
        icon = true,
        input = null, // { type: 'text', placeholder: 'Enter value', required: true }
        checkbox = null // { label: 'I understand', required: true }
      } = options;

      return new Promise((resolve) => {
        this.currentResolve = resolve;

        // Icon HTML
        const icons = {
          warning: 'bx-error-circle',
          danger: 'bx-x-circle',
          info: 'bx-info-circle',
          success: 'bx-check-circle'
        };

        const iconHTML = icon ? `<i class='bx ${icons[type]} confirm-modal-icon ${type}'></i>` : '';

        // Input HTML
        let inputHTML = '';
        if (input) {
          const inputType = input.type || 'text';
          const placeholder = input.placeholder || '';
          inputHTML = `
            <input 
              type="${inputType}" 
              class="confirm-modal-input" 
              placeholder="${placeholder}"
              id="confirm-modal-input"
              ${input.required ? 'required' : ''}
            >
          `;
        }

        // Checkbox HTML
        let checkboxHTML = '';
        if (checkbox) {
          checkboxHTML = `
            <div class="confirm-modal-checkbox">
              <input type="checkbox" id="confirm-modal-checkbox" ${checkbox.required ? 'required' : ''}>
              <label for="confirm-modal-checkbox">${checkbox.label}</label>
            </div>
          `;
        }

        // Build modal HTML
        this.overlay.innerHTML = `
          <div class="confirm-modal">
            <div class="confirm-modal-header">
              ${iconHTML}
              <h3 class="confirm-modal-title">${title}</h3>
            </div>
            <div class="confirm-modal-body">
              <p class="confirm-modal-message">${message}</p>
              ${inputHTML}
              ${checkboxHTML}
            </div>
            <div class="confirm-modal-actions">
              <button class="confirm-modal-btn confirm-modal-btn-cancel">${cancelText}</button>
              <button class="confirm-modal-btn confirm-modal-btn-confirm ${confirmType}">${confirmText}</button>
            </div>
          </div>
        `;

        // Get buttons
        const cancelBtn = this.overlay.querySelector('.confirm-modal-btn-cancel');
        const confirmBtn = this.overlay.querySelector('.confirm-modal-btn-confirm');
        const inputEl = input ? this.overlay.querySelector('#confirm-modal-input') : null;
        const checkboxEl = checkbox ? this.overlay.querySelector('#confirm-modal-checkbox') : null;

        // Handle cancel
        cancelBtn.addEventListener('click', () => this.hide(false));

        // Handle confirm
        confirmBtn.addEventListener('click', () => {
          // Validate input if required
          if (input && input.required && inputEl) {
            if (!inputEl.value.trim()) {
              inputEl.classList.add('error');
              inputEl.focus();
              return;
            }
          }

          // Validate checkbox if required
          if (checkbox && checkbox.required && checkboxEl) {
            if (!checkboxEl.checked) {
              checkboxEl.focus();
              return;
            }
          }

          // Resolve with input value or checkbox state
          let result = true;
          if (input && inputEl) {
            result = { confirmed: true, value: inputEl.value };
          } else if (checkbox && checkboxEl) {
            result = { confirmed: true, checked: checkboxEl.checked };
          }

          this.hide(result);
        });

        // Remove error class on input
        if (inputEl) {
          inputEl.addEventListener('input', () => {
            inputEl.classList.remove('error');
          });

          // Submit on Enter key
          inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              confirmBtn.click();
            }
          });
        }

        // Show modal
        this.overlay.classList.add('show');
        
        // Focus input or confirm button
        if (inputEl) {
          inputEl.focus();
        } else {
          confirmBtn.focus();
        }
      });
    }

    /**
     * Hide modal
     * @param {boolean|Object} result - Result to resolve promise with
  * /
    hide(result) {
      this.overlay.classList.add('hiding');
      
      setTimeout(() => {
        this.overlay.classList.remove('show', 'hiding');
        if (this.currentResolve) {
          this.currentResolve(result);
          this.currentResolve = null;
        }
      }, 200);
    }

    /**
     * Show simple alert (like window.alert but styled)
     * @param {Object} options - Alert options
     * @returns {Promise<void>}
  * /
    async alert(options = {}) {
      const {
        title = 'Alert',
        message = '',
        type = 'info',
        okText = 'OK'
      } = options;

      return new Promise((resolve) => {
        this.currentResolve = resolve;

        const icons = {
          warning: 'bx-error-circle',
          danger: 'bx-x-circle',
          info: 'bx-info-circle',
          success: 'bx-check-circle'
        };

        this.overlay.innerHTML = `
          <div class="confirm-modal">
            <div class="confirm-modal-header">
              <i class='bx ${icons[type]} confirm-modal-icon ${type}'></i>
              <h3 class="confirm-modal-title">${title}</h3>
            </div>
            <div class="confirm-modal-body">
              <p class="confirm-modal-message">${message}</p>
            </div>
            <div class="confirm-modal-actions">
              <button class="confirm-modal-btn confirm-modal-btn-confirm ${type}">${okText}</button>
            </div>
          </div>
        `;

        const okBtn = this.overlay.querySelector('.confirm-modal-btn-confirm');
        okBtn.addEventListener('click', () => this.hide(true));

        this.overlay.classList.add('show');
        okBtn.focus();
      });
    }

    /**
     * Show prompt dialog (like window.prompt but styled)
     * @param {Object} options - Prompt options
     * @returns {Promise<string|null>} - User input or null if cancelled
  * /
    async prompt(options = {}) {
      const result = await this.confirm({
        ...options,
        input: {
          type: options.inputType || 'text',
          placeholder: options.placeholder || '',
          required: true
        }
      });

      return result && result.confirmed ? result.value : null;
    }
  }

  // Create global instance
  window.confirmModal = new ConfirmationModal();

  // Helper functions
  window.confirmAction = (message, title = 'Confirm') => {
    return window.confirmModal.confirm({ title, message });
  };

  window.confirmDelete = (message = 'This action cannot be undone.') => {
    return window.confirmModal.confirm({
      title: 'Delete Confirmation',
      message: message,
      type: 'danger',
      confirmText: 'Delete',
      confirmType: 'danger'
    });
  };

  window.confirmLogout = () => {
    return window.confirmModal.confirm({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      type: 'warning',
      confirmText: 'Logout',
      confirmType: 'warning'
    });
  };

*/
