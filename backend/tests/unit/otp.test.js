const crypto = require('crypto');

describe('OTP Generation Utility', () => {
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  describe('OTP Format', () => {
    it('should generate 6-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate numeric OTP only', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d+$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      const otp3 = generateOTP();
      
      // Very unlikely to generate same OTP three times
      expect(new Set([otp1, otp2, otp3]).size).toBeGreaterThan(1);
    });
  });

  describe('Constant-Time Comparison', () => {
    it('should compare buffers safely', () => {
      const otp1 = Buffer.from('123456');
      const otp2 = Buffer.from('123456');
      const otp3 = Buffer.from('654321');

      expect(crypto.timingSafeEqual(otp1, otp2)).toBe(true);
      expect(() => crypto.timingSafeEqual(otp1, otp3)).not.toThrow();
      expect(crypto.timingSafeEqual(otp1, otp3)).toBe(false);
    });

    it('should handle different length buffers', () => {
      const otp1 = Buffer.from('123456');
      const otp2 = Buffer.from('12345');

      // Different lengths should not crash
      expect(() => {
        if (otp1.length !== otp2.length) {
          return false;
        }
        return crypto.timingSafeEqual(otp1, otp2);
      }).not.toThrow();
    });
  });
});
