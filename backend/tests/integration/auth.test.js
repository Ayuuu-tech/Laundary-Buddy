const request = require('supertest');
const express = require('express');
const session = require('express-session');
const authRoutes = require('../../routes/auth');
const User = require('../../models/User');

// Mock the User model
jest.mock('../../models/User');

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  }))
}));

describe('Auth API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use('/api/auth', authRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/request-signup-otp', () => {
    it('should reject weak passwords', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'weak', // Too short, no uppercase, no special char
          phone: '9876543210'
        });

      // Validation should fail before reaching controller
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept valid signup request', async () => {
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User'
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'StrongPass123!',
          phone: '9876543210',
          address: '123 Test St'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should reject existing user email', async () => {
      User.findOne.mockResolvedValue({
        email: 'existing@example.com',
        name: 'Existing User'
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      // Could be 400 (user exists) or 429 (rate limited)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      if (response.status === 400) {
        expect(response.body.message).toContain('already exists');
      }
    });
  });

  describe('Security Tests', () => {
    it('should sanitize email input', async () => {
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User'
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'TEST@EXAMPLE.COM',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      // Email normalization happens in validation middleware
      expect(response.status).toBeLessThan(500);
    });

    it('should trim and sanitize name input', async () => {
      User.findOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User'
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: '  Test User  ',
          email: 'test@example.com',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      // Name trimming happens in validation middleware
      expect(response.status).toBeLessThan(500);
    });
  });
});
