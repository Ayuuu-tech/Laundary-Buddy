const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');

const isAdmin = require('../middleware/admin');

// Get database stats
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const recentUsers = await User.find()
      // Note: Role-based access is handled by isAdmin middleware
      // No hardcoded emails or passwords should be here
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

// Get all orders (for laundry dashboard) with Pagination, Sort, Filter, Search
router.get('/orders', authMiddleware, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, search, priority, date } = req.query;

    // Build Query
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search) {
      // Search by orderNumber (exact) or Regex on others if needed (Regex is slow for 30k, use text index if possible)
      // For now, doing simple regex on orderNumber is okay if indexed, but for user name/room, populate first?
      // Better: perform lookups. But simplest for now is:
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'address': { $regex: search, $options: 'i' } }, // room number often in address
        // Note: searching localized user fields (name) requires aggregate lookup which is complex here.
        // We'll rely on orderNumber and Room for primary search for now.
      ];
    }

    if (date && date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let startDate;
      if (date === 'today') startDate = today;
      else if (date === 'yesterday') {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        startDate = y;
      }
      else if (date === 'week') {
        const w = new Date(today); w.setDate(w.getDate() - 7);
        startDate = w;
      }
      else if (date === 'month') {
        const m = new Date(today); m.setMonth(m.getMonth() - 1);
        startDate = m;
      }

      if (startDate) {
        // query based on createdAt (which is a Date object in Mongoose, so simple comparison)
        // If sorting by string date field (deliveryDate), it's harder. Let's use createdAt.
        query.createdAt = { $gte: startDate };
      }
    }

    // Execute Query
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone address') // optimizing populate: only needed fields
      .sort({ createdAt: -1 }) // Index on createdAt -1 needed
      .skip(skip)
      .limit(limit)
      .lean(); // Performance: return plain JS objects, not Mongoose docs

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
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
