// crypto-utils.js - Password hashing utilities
(function() {
  'use strict';

  class CryptoUtils {
    /**
     * Hash a password using SHA-256
     * @param {string} password - The password to hash
     * @returns {Promise<string>} - The hashed password in hex format
     */
    static async hashPassword(password) {
      try {
        // Convert password to Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        // Hash using SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        // Convert ArrayBuffer to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
      } catch (error) {
        console.error('Password hashing error:', error);
        // Fallback to simple hash if Web Crypto API is not available
        return this.simpleHash(password);
      }
    }

    /**
     * Verify password against hash
     * @param {string} password - The password to verify
     * @param {string} hash - The hash to verify against
     * @returns {Promise<boolean>} - True if password matches
     */
    static async verifyPassword(password, hash) {
      try {
        const hashedPassword = await this.hashPassword(password);
        return hashedPassword === hash;
      } catch (error) {
        console.error('Password verification error:', error);
        return false;
      }
    }

    /**
     * Simple hash fallback for browsers without Web Crypto API
     * @param {string} str - String to hash
     * @returns {string} - Hashed string
     */
    static simpleHash(str) {
      let hash = 0;
      if (str.length === 0) return hash.toString(16);
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Generate a random token
     * @param {number} length - Length of token
     * @returns {string} - Random token
     */
    static generateToken(length = 32) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Check if password meets security requirements
     * @param {string} password - Password to check
     * @returns {object} - Validation result with success and message
     */
    static validatePasswordStrength(password) {
      const minLength = 6;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      
      if (password.length < minLength) {
        return {
          valid: false,
          message: `Password must be at least ${minLength} characters long`
        };
      }

      if (!hasUpperCase) {
        return {
          valid: false,
          message: 'Password must contain at least one uppercase letter'
        };
      }

      if (!hasLowerCase) {
        return {
          valid: false,
          message: 'Password must contain at least one lowercase letter'
        };
      }

      if (!hasNumber) {
        return {
          valid: false,
          message: 'Password must contain at least one number'
        };
      }

      return {
        valid: true,
        message: 'Password is strong'
      };
    }
  }

  // Export to global scope
  window.CryptoUtils = CryptoUtils;
})();
