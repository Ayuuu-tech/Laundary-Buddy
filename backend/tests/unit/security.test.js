const { helmetConfig, createRateLimiter, apiLimiter, authLimiter, otpLimiter } = require('../../middleware/security');

describe('Security Middleware', () => {
  describe('Helmet Configuration', () => {
    it('should export helmet config', () => {
      expect(helmetConfig).toBeDefined();
      expect(typeof helmetConfig).toBe('function');
    });
  });

  describe('Rate Limiters', () => {
    it('should export API rate limiter', () => {
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should export auth rate limiter', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should export OTP rate limiter', () => {
      expect(otpLimiter).toBeDefined();
      expect(typeof otpLimiter).toBe('function');
    });
  });

  describe('Create Rate Limiter Function', () => {
    it('should create custom rate limiter', () => {
      const limiter = createRateLimiter(60000, 10);
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });
  });
});
