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

const { getUserModel } = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const User = getUserModel();
    // req.user is populated by authMiddleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findByPk(req.user.id);
    if (user && user.isAdmin) {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ success: false, message: 'Server error checking admin status.' });
  }
};

module.exports = isAdmin;
