const User = require('../../models/User');

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should have required fields', () => {
      const user = new User();
      const validationError = user.validateSync();
      
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
    });

    it('should create user with valid data', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword123'
      };
      
      const user = new User(userData);
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
    });
  });

  describe('Account Locking Methods', () => {
    it('should check if account is locked', () => {
      const user = new User({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        accountLockedUntil: new Date(Date.now() + 1000 * 60 * 15)
      });

      expect(user.isAccountLocked()).toBe(true);
    });

    it('should check if account is not locked', () => {
      const user = new User({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        accountLockedUntil: null
      });

      expect(user.isAccountLocked()).toBe(false);
    });

    it('should check if lock has expired', () => {
      const user = new User({
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
      const user = new User({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 0
      });

      // Mock save
      user.save = jest.fn().mockResolvedValue(user);
      
      await user.incrementLoginAttempts();
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('should lock account after max attempts', async () => {
      process.env.MAX_LOGIN_ATTEMPTS = '5';
      const user = new User({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 4
      });

      user.save = jest.fn().mockResolvedValue(user);
      
      await user.incrementLoginAttempts();
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.accountLockedUntil).toBeDefined();
    });

    it('should reset failed login attempts', async () => {
      const user = new User({
        name: 'Test',
        email: 'test@example.com',
        password: 'pass',
        failedLoginAttempts: 5,
        accountLockedUntil: new Date()
      });

      user.save = jest.fn().mockResolvedValue(user);
      
      await user.resetLoginAttempts();
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.accountLockedUntil).toBeNull();
    });
  });
});
