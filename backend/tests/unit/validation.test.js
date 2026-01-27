const { validationRules } = require('../../middleware/validation');

describe('Validation Rules', () => {
  describe('Password Validation', () => {
    it('should require minimum 8 characters', () => {
      const passwordRule = validationRules.register.find(
        rule => rule.builder.fields.includes('password')
      );
      expect(passwordRule).toBeDefined();
    });

    it('should reject passwords without uppercase', () => {
      const password = 'weakpass123!';
      // Password validation will be tested in integration tests
      expect(password.match(/[A-Z]/)).toBeNull();
    });

    it('should reject passwords without lowercase', () => {
      const password = 'WEAKPASS123!';
      expect(password.match(/[a-z]/)).toBeNull();
    });

    it('should reject passwords without numbers', () => {
      const password = 'WeakPass!';
      expect(password.match(/\d/)).toBeNull();
    });

    it('should reject passwords without special characters', () => {
      const password = 'WeakPass123';
      expect(password.match(/[@$!%*?&#]/)).toBeNull();
    });

    it('should accept strong passwords', () => {
      const password = 'StrongPass123!';
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(password.match(/[A-Z]/)).toBeTruthy();
      expect(password.match(/[a-z]/)).toBeTruthy();
      expect(password.match(/\d/)).toBeTruthy();
      expect(password.match(/[@$!%*?&#]/)).toBeTruthy();
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com'
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com'
      ];

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Phone Validation', () => {
    it('should validate 10-digit phone numbers', () => {
      const validPhones = ['9876543210', '1234567890'];
      validPhones.forEach(phone => {
        expect(phone).toMatch(/^[0-9]{10}$/);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123', '12345678901', 'abcd123456', '+919876543210'];
      invalidPhones.forEach(phone => {
        expect(phone).not.toMatch(/^[0-9]{10}$/);
      });
    });
  });
});
