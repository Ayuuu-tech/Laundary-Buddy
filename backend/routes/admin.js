const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');

// Middleware to check if user is admin (you can enhance this)
const isAdmin = async (req, res, next) => {
  try {
    console.log('🔒 Admin check for user:', req.user?.id);
    const user = await User.findById(req.user?.id);
    console.log('🔒 User found:', { email: user?.email, isAdmin: user?.isAdmin });
    // Add admin check logic here (e.g., check email or role)
    if (user && (user.email === 'ayushmaan.ggn@gmail.com' || user.isAdmin)) {
      console.log('✅ Admin access granted');
      next();
    } else {
      console.log('❌ Admin access denied - not an admin', { user });
      return res.status(403).json({ success: false, message: 'Access denied', user });
    }
  } catch (error) {
    console.log('❌ Admin check error:', error.message);
    return res.status(500).json({ success: false, message: 'Error checking admin status', error: error.message });
  }
};

// Get database stats
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');
    
    const sessionsCollection = req.app.locals.db.collection('sessions');
    const activeSessions = await sessionsCollection.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeSessions,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats',
      error: error.message 
    });
  }
});

// Get all users (paginated)
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users',
      error: error.message 
    });
  }
});

// Get active sessions
router.get('/sessions', authMiddleware, isAdmin, async (req, res) => {
  try {
    const sessionsCollection = req.app.locals.db.collection('sessions');
    const sessions = await sessionsCollection.find().toArray();

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s._id,
        userId: s.session?.userId,
        expires: s.expires,
        createdAt: s.session?.cookie?.expires
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching sessions',
      error: error.message 
    });
  }
});

// Get all orders (for laundry dashboard)
router.get('/orders', authMiddleware, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders',
      error: error.message 
    });
  }
});

module.exports = router;
