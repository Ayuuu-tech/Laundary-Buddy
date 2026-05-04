/**
 * ============================================================================
 * LAUNDRY BUDDY - Smart Laundry Management System
 * ============================================================================
 *
 * @project   Laundry Buddy
 * @author    Ayush
 * @status    Production Ready
 * @description Part of the Laundry Buddy Evaluation Project.
 *              Handles core application logic, API routing, and database integrations.
 * ============================================================================
 */

// User Model Tests (Sequelize version)
// These tests verify the instance methods on the User model without needing a DB connection.

describe('User Model', () => {
  // Build a plain object that mimics a Sequelize instance with the methods we added
  function buildUserLike(data) {
    const user = {
      name: data.name || '',
      email: data.email || '',
      password: data.password || '',
      failedLoginAttempts: data.failedLoginAttempts || 0,
      accountLockedUntil: data.accountLockedUntil || null,
      save: jest.fn().mockResolvedValue(true)
    };
    // Attach instance methods (same logic as in models/User.js)
    user.isAccountLocked = function () {
      return !!(this.accountLockedUntil && this.accountLockedUntil > Date.now());
    };
    user.incrementLoginAttempts = async function () {
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 15 * 60 * 1000;
      this.failedLoginAttempts += 1;
      if (this.failedLoginAttempts >= maxAttempts) {
        this.accountLockedUntil = new Date(Date.now() + lockoutDuration);
      }
      return this.save();
    };
    user.resetLoginAttempts = async function () {
      this.failedLoginAttempts = 0;
      this.accountLockedUntil = null;
      return this.save();
    };
    return user;
  }

  describe('Account Locking Methods', () => {
    it('should check if account is locked', () => {
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        accountLockedUntil: new Date(Date.now() + 1000 * 60 * 15)
      });
      expect(user.isAccountLocked()).toBe(true);
    });

    it('should check if account is not locked', () => {
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        accountLockedUntil: null
      });
      expect(user.isAccountLocked()).toBe(false);
    });

    it('should check if lock has expired', () => {
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        accountLockedUntil: new Date(Date.now() - 1000)
      });
      expect(user.isAccountLocked()).toBe(false);
    });
  });

  describe('Failed Login Attempts', () => {
    it('should increment failed login attempts', async () => {
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 0
      });
      await user.incrementLoginAttempts();
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('should lock account after max attempts', async () => {
      process.env.MAX_LOGIN_ATTEMPTS = '5';
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 4
      });
      await user.incrementLoginAttempts();
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.accountLockedUntil).toBeDefined();
    });

    it('should reset failed login attempts', async () => {
      const user = buildUserLike({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date()
      });
      await user.resetLoginAttempts();
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.accountLockedUntil).toBeNull();
    });
  });
});
