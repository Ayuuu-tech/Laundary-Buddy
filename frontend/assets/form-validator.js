// form-validator.js - Comprehensive form validation utility
(function() {
  'use strict';

  class FormValidator {
    constructor(formElement, options = {}) {
      this.form = formElement;
      this.options = {
        validateOnBlur: true,
        validateOnInput: true,
        showInlineErrors: true,
        showSuccessStates: true,
        ...options
      };
      this.rules = {};
      this.errors = {};
      this.init();
    }

    init() {
      if (this.options.validateOnBlur) {
        this.form.addEventListener('focusout', (e) => {
          if (e.target.matches('input, select, textarea')) {
            this.validateField(e.target);
          }
        });
      }

      if (this.options.validateOnInput) {
        this.form.addEventListener('input', (e) => {
          if (e.target.matches('input, select, textarea')) {
            // Only validate if field was already validated once
            if (e.target.classList.contains('error') || e.target.classList.contains('success')) {
              this.validateField(e.target);
            }
          }
        });
      }
    }

    /**
     * Add validation rule for a field
     * @param {string} fieldName - Name or ID of the field
     * @param {Array} rules - Array of validation rules
     */
    addRule(fieldName, rules) {
      this.rules[fieldName] = rules;
    }

    /**
     * Validate a single field
     * @param {HTMLElement} field - The input field to validate
     * @returns {boolean} - True if valid
     */
    validateField(field) {
      const fieldName = field.name || field.id;
      const rules = this.rules[fieldName];

      if (!rules) return true;

      // Clear previous errors
      this.clearFieldError(field);

      // Run all validation rules
      for (const rule of rules) {
        const result = this.runRule(field.value, rule);
        if (!result.valid) {
          this.showFieldError(field, result.message);
          this.errors[fieldName] = result.message;
          return false;
        }
      }

      // Show success state
      if (this.options.showSuccessStates && field.value.trim() !== '') {
        this.showFieldSuccess(field);
      }

      delete this.errors[fieldName];
      return true;
    }

    /**
     * Run a single validation rule
     * @param {string} value - Field value
     * @param {Object} rule - Validation rule
     * @returns {Object} - Validation result
     */
    runRule(value, rule) {
      switch (rule.type) {
        case 'required':
          return {
            valid: value.trim() !== '',
            message: rule.message || 'This field is required'
          };

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return {
            valid: emailRegex.test(value),
            message: rule.message || 'Please enter a valid email address'
          };

        case 'minLength':
          return {
            valid: value.length >= rule.value,
            message: rule.message || `Must be at least ${rule.value} characters`
          };

        case 'maxLength':
          return {
            valid: value.length <= rule.value,
            message: rule.message || `Must be no more than ${rule.value} characters`
          };

        case 'pattern':
          return {
            valid: rule.value.test(value),
            message: rule.message || 'Invalid format'
          };

        case 'match':
          const matchField = this.form.querySelector(`[name="${rule.field}"], #${rule.field}`);
          return {
            valid: value === matchField.value,
            message: rule.message || 'Fields do not match'
          };

        case 'custom':
          return rule.validator(value);

        default:
          return { valid: true };
      }
    }

    /**
     * Show error state for field
     * @param {HTMLElement} field - The input field
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
      field.classList.remove('success');
      field.classList.add('error');

      if (this.options.showInlineErrors) {
        // Remove existing error message
        const wrapper = field.closest('.password-wrapper') || field.closest('.input-wrapper') || field.parentElement;

        // Remove existing error message (inside wrapper or immediate sibling)
        const existingError = wrapper.querySelector('.error-message') || (wrapper.nextElementSibling && wrapper.nextElementSibling.classList && wrapper.nextElementSibling.classList.contains('error-message') ? wrapper.nextElementSibling : null);
        if (existingError) existingError.remove();

        // Create and show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message show';
        errorDiv.innerHTML = `<i class='bx bx-error-circle'></i>${message}`;
        
        // Place the message after the wrapper so it sits below the field
        wrapper.insertAdjacentElement('afterend', errorDiv);
      }

      // Show error icon
      this.updateFieldIcon(field, 'error');
    }

    /**
     * Show success state for field
     * @param {HTMLElement} field - The input field
     */
    showFieldSuccess(field) {
      field.classList.remove('error');
      field.classList.add('success');

      // Remove error message
      const wrapper = field.closest('.password-wrapper') || field.closest('.input-wrapper') || field.parentElement;
      const errorMessage = wrapper.querySelector('.error-message') || (wrapper.nextElementSibling && wrapper.nextElementSibling.classList && wrapper.nextElementSibling.classList.contains('error-message') ? wrapper.nextElementSibling : null);
      if (errorMessage) errorMessage.remove();

      // Show success icon
      this.updateFieldIcon(field, 'success');
    }

    /**
     * Clear field error/success state
     * @param {HTMLElement} field - The input field
     */
    clearFieldError(field) {
      field.classList.remove('error', 'success');
      
      const wrapper = field.closest('.password-wrapper') || field.closest('.input-wrapper') || field.parentElement;
      const errorMessage = wrapper.querySelector('.error-message') || (wrapper.nextElementSibling && wrapper.nextElementSibling.classList && wrapper.nextElementSibling.classList.contains('error-message') ? wrapper.nextElementSibling : null);
      if (errorMessage) errorMessage.remove();

      const icon = field.parentElement.querySelector('.input-icon');
      if (icon) {
        icon.classList.remove('show');
      }
    }

    /**
     * Update field icon
     * @param {HTMLElement} field - The input field
     * @param {string} type - 'error' or 'success'
     */
    updateFieldIcon(field, type) {
      const wrapper = field.closest('.input-wrapper');
      if (!wrapper) return;

      let icon = wrapper.querySelector('.input-icon');
      if (!icon) {
        icon = document.createElement('i');
        icon.className = 'input-icon';
        wrapper.appendChild(icon);
      }

      icon.className = 'input-icon show ' + type;
      if (type === 'error') {
        icon.classList.add('bx', 'bx-error-circle');
      } else {
        icon.classList.add('bx', 'bx-check-circle');
      }
    }

    /**
     * Validate entire form
     * @returns {boolean} - True if all fields are valid
     */
    validateForm() {
      let isValid = true;
      this.errors = {};

      // Validate all fields with rules
      for (const fieldName in this.rules) {
        const field = this.form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (field) {
          if (!this.validateField(field)) {
            isValid = false;
          }
        }
      }

      // Show error summary if form is invalid
      if (!isValid) {
        this.showErrorSummary();
      } else {
        this.hideErrorSummary();
      }

      return isValid;
    }

    /**
     * Show error summary at top of form
     */
    showErrorSummary() {
      let summary = this.form.querySelector('.form-errors-summary');
      
      if (!summary) {
        summary = document.createElement('div');
        summary.className = 'form-errors-summary';
        this.form.insertBefore(summary, this.form.firstChild);
      }

      const errorList = Object.entries(this.errors)
        .map(([field, message]) => `<li>${message}</li>`)
        .join('');

      summary.innerHTML = `
        <h4><i class='bx bx-error-circle'></i> Please fix the following errors:</h4>
        <ul>${errorList}</ul>
      `;
      
      summary.classList.add('show');
      summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Hide error summary
     */
    hideErrorSummary() {
      const summary = this.form.querySelector('.form-errors-summary');
      if (summary) {
        summary.classList.remove('show');
      }
    }

    /**
     * Reset form validation states
     */
    reset() {
      this.errors = {};
      this.hideErrorSummary();

      const fields = this.form.querySelectorAll('input, select, textarea');
      fields.forEach(field => this.clearFieldError(field));
    }

    /**
     * Get all errors
     * @returns {Object} - Object with field names and error messages
     */
    getErrors() {
      return this.errors;
    }

    /**
     * Check if form has errors
     * @returns {boolean} - True if there are errors
     */
    hasErrors() {
      return Object.keys(this.errors).length > 0;
    }
  }

  // Password strength checker
  class PasswordStrength {
    static check(password) {
      let strength = 0;
      const feedback = [];

      // Length check
      if (password.length >= 8) {
        strength += 25;
      } else if (password.length >= 6) {
        strength += 15;
        feedback.push('Use 8+ characters for better security');
      } else {
        feedback.push('Password too short');
      }

      // Uppercase check
      if (/[A-Z]/.test(password)) {
        strength += 25;
      } else {
        feedback.push('Add uppercase letters');
      }

      // Lowercase check
      if (/[a-z]/.test(password)) {
        strength += 25;
      } else {
        feedback.push('Add lowercase letters');
      }

      // Number check
      if (/[0-9]/.test(password)) {
        strength += 15;
      } else {
        feedback.push('Add numbers');
      }

      // Special character check
      if (/[^A-Za-z0-9]/.test(password)) {
        strength += 10;
      } else {
        feedback.push('Add special characters (!@#$%^&*)');
      }

      // Determine level
      let level = 'weak';
      if (strength >= 75) {
        level = 'strong';
      } else if (strength >= 50) {
        level = 'medium';
      }

      return {
        strength,
        level,
        feedback
      };
    }

    static showIndicator(inputElement, containerSelector) {
      const container = document.querySelector(containerSelector);
      if (!container) return;

      inputElement.addEventListener('input', function() {
        const result = PasswordStrength.check(this.value);
        
        let indicator = container.querySelector('.password-strength');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'password-strength';
          indicator.innerHTML = `
            <div class="password-strength-bar"></div>
            <div class="password-strength-text"></div>
          `;
          container.appendChild(indicator);
        }

        if (this.value.length > 0) {
          indicator.classList.add('show');
          const bar = indicator.querySelector('.password-strength-bar');
          const text = indicator.querySelector('.password-strength-text');

          bar.className = `password-strength-bar ${result.level}`;
          text.className = `password-strength-text ${result.level}`;
          text.textContent = `${result.level.charAt(0).toUpperCase() + result.level.slice(1)} password`;
        } else {
          indicator.classList.remove('show');
        }
      });
    }
  }

  // Export to global scope
  window.FormValidator = FormValidator;
  window.PasswordStrength = PasswordStrength;
})();
