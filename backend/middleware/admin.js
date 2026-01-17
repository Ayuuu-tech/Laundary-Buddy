const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        // req.user is populated by authMiddleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const user = await User.findById(req.user.id);
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
