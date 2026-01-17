const authMiddleware = async (req, res, next) => {
  try {
    // Check if user session exists
    if (!req.session || !req.session.userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ No session or userId found');
      }
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please login.'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ User authenticated:', req.session.userId);
    }

    // Attach user info to request
    req.user = {
      id: req.session.userId,
      ...req.session.user
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
