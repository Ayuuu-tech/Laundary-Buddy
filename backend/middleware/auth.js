const { logger } = require('./logger');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Check if user session exists
    if (!req.session || !req.session.userId) {

      // FALLBACK: Check for Bearer Token (for Android App)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            // Verify isAdmin from database instead of trusting the JWT claim
            const dbUser = await User.findById(decoded.id).select('isAdmin email').lean();
            if (!dbUser) {
              return res.status(401).json({ success: false, message: 'User not found.' });
            }
            req.user = {
              id: decoded.id,
              email: dbUser.email || decoded.email,
              isAdmin: dbUser.isAdmin
            };
            return next();
          }
        } catch (jwtErr) {
          // Token invalid, proceed to 401
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Invalid token', jwtErr.message);
          }
        }
      }

      if (process.env.NODE_ENV === 'development') {
        logger.debug('No session or userId found');
      }
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please login.'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug('User authenticated', { userId: req.session.userId });
    }

    // Attach user info to request (Session path)
    req.user = {
      id: req.session.userId,
      ...req.session.user
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message, stack: error.stack });
    return res.status(401).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
