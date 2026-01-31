const { logger } = require('./logger');

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
            req.user = {
              id: decoded.id,
              email: decoded.email,
              isAdmin: decoded.isAdmin
            };
            // Optional: You could load full user from DB if controllers expect more fields attached to req.user
            // check if controllers use req.user.phone etc without fetching DB.
            // Most controllers query DB using req.user.id.
            // Some might use req.user.isAdmin.
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
