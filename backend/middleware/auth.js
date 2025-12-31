const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 Auth Check - Session ID:', req.sessionID);
    console.log('🔐 Auth Check - Session Data:', req.session);
    console.log('🔐 Auth Check - Cookies:', req.cookies);
    
    // Check if user session exists
    if (!req.session || !req.session.userId) {
      console.log('❌ No session or userId found', { session: req.session });
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please login.',
        session: req.session
      });
    }

    console.log('✅ User authenticated:', req.session.userId, { session: req.session });

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
