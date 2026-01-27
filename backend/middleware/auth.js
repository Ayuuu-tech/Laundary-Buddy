const { logger } = require('./logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Check if user session exists
    if (!req.session || !req.session.userId) {
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

    // Attach user info to request
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
