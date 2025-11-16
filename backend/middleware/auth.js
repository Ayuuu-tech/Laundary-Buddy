const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure req.user.id is a valid Mongo ObjectId. If not, try to resolve by email.
    let userId = decoded?.id;
    const email = (decoded?.email || '').toLowerCase();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      if (email) {
        const user = await User.findOne({ email });
        if (user) {
          // Replace legacy/invalid id (e.g., UUID) with actual Mongo _id
          decoded.id = user._id.toString();
          // Optional: log once to help diagnose legacy tokens in logs
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`Auth: normalized legacy token id for ${email} -> ${decoded.id}`);
          }
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid token: user not found. Please login again.'
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload. Please login again.'
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

module.exports = authMiddleware;
