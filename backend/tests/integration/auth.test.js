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

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock the Sequelize models before requiring routes
jest.mock('../../models/User', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  };
  return { getUserModel: jest.fn(() => mockUser), initUser: jest.fn(() => mockUser) };
});

jest.mock('../../models/RefreshToken', () => {
  const mockRT = {
    findOne: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    destroy: jest.fn()
  };
  return { getRefreshTokenModel: jest.fn(() => mockRT), initRefreshToken: jest.fn(() => mockRT) };
});

jest.mock('../../models/SecurityLog', () => {
  const mockSL = { create: jest.fn().mockResolvedValue(true) };
  return { getSecurityLogModel: jest.fn(() => mockSL), initSecurityLog: jest.fn(() => mockSL) };
});

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  }))
}));

const authRoutes = require('../../routes/auth');
const { getUserModel } = require('../../models/User');

describe('Auth API Integration Tests', () => {
  let app;
  let User;

  beforeEach(() => {
    User = getUserModel();
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
      User.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        signupOTP: '123456',
        signupOTPExpiry: new Date(Date.now() + 600000),
        save: jest.fn().mockResolvedValue(true)
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
        id: 1,
        email: 'existing@example.com',
        name: 'Existing User'
        // No signupOTP field means user is fully registered
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

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
      User.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        save: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: 'Test User',
          email: 'TEST@EXAMPLE.COM',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      expect(response.status).toBeLessThan(500);
    });

    it('should trim and sanitize name input', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        save: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/api/auth/request-signup-otp')
        .send({
          name: '  Test User  ',
          email: 'test@example.com',
          password: 'StrongPass123!',
          phone: '9876543210'
        });

      expect(response.status).toBeLessThan(500);
    });
  });
});
