// email-validator.js - Email validation with suggestions
(function() {
  'use strict';

  class EmailValidator {
    constructor() {
      // Common email domains
      this.commonDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'icloud.com',
        'live.com',
        'aol.com',
        'mail.com',
        'protonmail.com',
        'bmu.edu.in' // Your institution domain
      ];

      // Common typos
      this.domainTypos = {
        'gmial.com': 'gmail.com',
        'gmai.com': 'gmail.com',
        'gmil.com': 'gmail.com',
        'yahooo.com': 'yahoo.com',
        'yaho.com': 'yahoo.com',
        'hotmial.com': 'hotmail.com',
        'hotmai.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outloo.com': 'outlook.com',
        'iclod.com': 'icloud.com',
        'iclould.com': 'icloud.com'
      };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {Object} - Validation result
     */
    validate(email) {
      if (!email || typeof email !== 'string') {
        return {
          valid: false,
          message: 'Email is required'
        };
      }

      // Basic format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          valid: false,
          message: 'Please enter a valid email address'
        };
      }

      // Check for common issues
      const trimmedEmail = email.trim().toLowerCase();
      
      // Check for spaces
      if (email.includes(' ')) {
        return {
          valid: false,
          message: 'Email cannot contain spaces'
        };
      }

      // Check for multiple @
      if ((email.match(/@/g) || []).length > 1) {
        return {
          valid: false,
          message: 'Email can only contain one @ symbol'
        };
      }

      // Check for invalid characters
      const invalidChars = /[<>()[\]\\,;:\s]/;
      if (invalidChars.test(email)) {
        return {
          valid: false,
          message: 'Email contains invalid characters'
        };
      }

      // Check domain
      const parts = trimmedEmail.split('@');
      if (parts.length !== 2) {
        return {
          valid: false,
          message: 'Invalid email format'
        };
      }

      const [localPart, domain] = parts;

      // Local part validation
      if (localPart.length === 0) {
        return {
          valid: false,
          message: 'Email cannot start with @'
        };
      }

      if (localPart.length > 64) {
        return {
          valid: false,
          message: 'Email username is too long'
        };
      }

      // Domain validation
      if (domain.length === 0) {
        return {
          valid: false,
          message: 'Email domain is required'
        };
      }

      if (!domain.includes('.')) {
        return {
          valid: false,
          message: 'Email domain must include a top-level domain (e.g., .com)'
        };
      }

      const domainParts = domain.split('.');
      if (domainParts.some(part => part.length === 0)) {
        return {
          valid: false,
          message: 'Invalid email domain format'
        };
      }

      // Check for typos and suggest corrections
      const suggestion = this.getSuggestion(domain);
      if (suggestion) {
        return {
          valid: true,
          suggestion: `${localPart}@${suggestion}`,
          message: `Did you mean ${localPart}@${suggestion}?`
        };
      }

      return {
        valid: true,
        message: 'Email is valid'
      };
    }

    /**
     * Get email suggestion if there's a typo
     * @param {string} domain - Email domain
     * @returns {string|null} - Suggested domain or null
     */
    getSuggestion(domain) {
      domain = domain.toLowerCase();

      // Check direct typo matches
      if (this.domainTypos[domain]) {
        return this.domainTypos[domain];
      }

      // Check for close matches using Levenshtein distance
      let closestDomain = null;
      let minDistance = Infinity;

      for (const commonDomain of this.commonDomains) {
        const distance = this.levenshteinDistance(domain, commonDomain);
        
        // If distance is small enough, it might be a typo
        if (distance <= 2 && distance < minDistance) {
          minDistance = distance;
          closestDomain = commonDomain;
        }
      }

      return closestDomain;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} - Edit distance
     */
    levenshteinDistance(str1, str2) {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    }

    /**
     * Add email validation to input field
     * @param {HTMLInputElement} input - Email input field
     * @param {Object} options - Options
     */
    addTo(input, options = {}) {
      const showSuggestion = options.showSuggestion !== false;
      
      input.addEventListener('blur', () => {
        const email = input.value.trim();
        if (!email) return;

        const result = this.validate(email);
        
        // Remove existing suggestion
        const existingSuggestion = input.parentElement.querySelector('.email-suggestion');
        if (existingSuggestion) {
          existingSuggestion.remove();
        }

        if (result.valid && result.suggestion && showSuggestion) {
          // Show suggestion
          const suggestionEl = document.createElement('div');
          suggestionEl.className = 'email-suggestion';
          suggestionEl.innerHTML = `<i class='bx bx-info-circle'></i> ${result.message}`;
          suggestionEl.style.cursor = 'pointer';
          
          suggestionEl.addEventListener('click', () => {
            input.value = result.suggestion;
            suggestionEl.remove();
            
            // Trigger validation
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
          });
          
          input.parentElement.appendChild(suggestionEl);
        }
      });
    }

    /**
     * Check if email is disposable (temporary email)
     * @param {string} email - Email to check
     * @returns {boolean} - True if disposable
     */
    isDisposable(email) {
      const disposableDomains = [
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com',
        'tempmail.com',
        'throwaway.email',
        'temp-mail.org'
      ];

      const domain = email.split('@')[1]?.toLowerCase();
      return disposableDomains.includes(domain);
    }

    /**
     * Validate multiple emails (comma or semicolon separated)
     * @param {string} emails - Multiple emails string
     * @returns {Object} - Validation result
     */
    validateMultiple(emails) {
      const emailList = emails.split(/[,;]/).map(e => e.trim()).filter(e => e);
      const results = emailList.map(email => ({
        email,
        ...this.validate(email)
      }));

      const valid = results.every(r => r.valid);
      const invalid = results.filter(r => !r.valid);

      return {
        valid,
        results,
        invalid,
        count: emailList.length
      };
    }
  }

  // Export to global scope
  window.EmailValidator = EmailValidator;
  window.emailValidator = new EmailValidator();
})();
