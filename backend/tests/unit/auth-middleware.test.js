const jwt = require('jsonwebtoken');

// Mock User model
jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../../models/User');

// Mock logger
jest.mock('../../middleware/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

const authMiddleware = require('../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      session: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  describe('Session-based auth', () => {
    it('should authenticate with valid session', async () => {
      req.session = {
        userId: 'user123',
        user: { id: 'user123', name: 'Test User', email: 'test@test.com', isAdmin: false }
      };

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe('user123');
    });

    it('should reject when no session exists', async () => {
      req.session = {};

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('JWT Bearer token auth', () => {
    it('should verify isAdmin from database, not JWT claim', async () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@test.com', isAdmin: true },
        'test-secret'
      );
      req.headers.authorization = `Bearer ${token}`;
      req.session = {};

      // DB says user is NOT admin, even though JWT says isAdmin: true
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: 'user123', email: 'test@test.com', isAdmin: false })
        })
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.isAdmin).toBe(false); // Must use DB value, not JWT claim
    });

    it('should reject if user not found in database', async () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@test.com', isAdmin: false },
        'test-secret'
      );
      req.headers.authorization = `Bearer ${token}`;
      req.session = {};

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject with invalid JWT', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      req.session = {};

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
