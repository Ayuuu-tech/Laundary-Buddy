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

const express = require('express');
const router = express.Router();
const { getUserModel } = require('../models/User');
const { getOrderModel } = require('../models/Order');
const { getTrackingModel } = require('../models/Tracking');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/admin');
const { Op } = require('sequelize');

// Get database stats
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const User = getUserModel();
    const totalUsers = await User.count();
    const recentUsers = await User.findAll({
      limit: 10,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    // Count active sessions from PostgreSQL sessions table
    let activeSessions = 0;
    try {
      const sequelize = req.app.locals.sequelize;
      if (sequelize) {
        const [results] = await sequelize.query('SELECT COUNT(*) as count FROM "sessions" WHERE expire > NOW()');
        activeSessions = results[0]?.count || 0;
      }
    } catch (sessErr) {
      console.error('Error counting sessions:', sessErr);
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeSessions,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
});

// Get all users (paginated)
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const User = getUserModel();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      users,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
});

// Get active sessions
router.get('/sessions', authMiddleware, isAdmin, async (req, res) => {
  try {
    const sequelize = req.app.locals.sequelize;
    let sessions = [];
    if (sequelize) {
      const [results] = await sequelize.query('SELECT sid, expire, sess FROM "sessions"');
      sessions = results.map(s => {
        let sessionData = {};
        try {
          sessionData = typeof s.sess === 'string' ? JSON.parse(s.sess) : s.sess;
        } catch { }
        return {
          id: s.sid,
          userId: sessionData?.userId,
          expires: s.expire,
          createdAt: sessionData?.cookie?.expires
        };
      });
    }

    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sessions', error: error.message });
  }
});

// Get all orders (for laundry dashboard) with Pagination, Sort, Filter, Search
router.get('/orders', authMiddleware, isAdmin, async (req, res) => {
  try {
    const Order = getOrderModel();
    const User = getUserModel();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { status, search, priority, date } = req.query;

    // Build Where clause
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } }
      ];
    }

    if (date && date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let startDate;
      if (date === 'today') {
        startDate = today;
      } else if (date === 'yesterday') {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        startDate = y;
      } else if (date === 'week') {
        const w = new Date(today); w.setDate(w.getDate() - 7);
        startDate = w;
      } else if (date === 'month') {
        const m = new Date(today); m.setMonth(m.getMonth() - 1);
        startDate = m;
      }

      if (startDate) {
        where.createdAt = { [Op.gte]: startDate };
      }
    }

    // Execute Query
    const { count: totalOrders, rows: orders } = await Order.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'email', 'phone', 'address']
      }],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      raw: false
    });

    res.json({
      success: true,
      orders,
      pagination: { page, limit, total: totalOrders, pages: Math.ceil(totalOrders / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// Update order status (admin only)
router.put('/orders/:id/status', authMiddleware, isAdmin, async (req, res) => {
  try {
    const Order = getOrderModel();
    const Tracking = getTrackingModel();
    const User = getUserModel();
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const validStatuses = ['pending', 'submitted', 'received', 'washing', 'drying', 'folding', 'ready', 'ready-for-pickup', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status.toLowerCase();
    await order.save();

    // Update tracking if exists
    const tracking = await Tracking.findOne({ where: { orderId: order.id } });
    if (tracking) {
      tracking.status = status.toLowerCase();
      const timeline = tracking.timeline || [];
      timeline.push({
        status: status.toLowerCase(),
        timestamp: new Date(),
        note: `Status updated by staff from ${previousStatus} to ${status}`
      });
      tracking.timeline = timeline;
      tracking.changed('timeline', true);
      await tracking.save();
    }

    // Send push notification to user
    if (status !== previousStatus) {
      const notificationController = require('../controllers/notificationController');
      try {
        await notificationController.sendNotificationToUser(order.userId, {
          title: 'Order Status Updated',
          body: `Your order #${order.orderNumber} status is now: ${status}`,
          url: `/track.html?id=${order.id}`
        });
      } catch (notifyErr) {
        console.error('Failed to send push notification:', notifyErr);
      }
    }

    // Reload with user info for response
    const updatedOrder = await Order.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone', 'address'] }]
    });

    res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
  }
});

// ================ ACTIVITY LOGS ================

// Get all activity logs (paginated, filterable)
router.get('/logs', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { getActivityLogModel } = require('../models/ActivityLog');
    const ActivityLog = getActivityLogModel();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { category, severity, userId, search, dateFrom, dateTo, action } = req.query;

    // Build where clause
    const where = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (severity && severity !== 'all') {
      where.severity = severity;
    }

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (action && action !== 'all') {
      where.action = action;
    }

    if (search) {
      where[Op.or] = [
        { route: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { userName: { [Op.iLike]: `%${search}%` } },
        { userEmail: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const { count: totalLogs, rows: logs } = await ActivityLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    // Get summary stats
    const totalToday = await ActivityLog.count({
      where: {
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    const uniqueUsersToday = await ActivityLog.count({
      where: {
        userId: { [Op.ne]: null },
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      },
      distinct: true,
      col: 'userId'
    });

    const errorsToday = await ActivityLog.count({
      where: {
        severity: { [Op.in]: ['warning', 'critical'] },
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    res.json({
      success: true,
      logs,
      stats: {
        totalToday,
        uniqueUsersToday,
        errorsToday
      },
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, message: 'Error fetching logs', error: error.message });
  }
});

// Get log statistics
router.get('/logs/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { getActivityLogModel } = require('../models/ActivityLog');
    const ActivityLog = getActivityLogModel();
    const sequelize = req.app.locals.sequelize;

    const today = new Date(new Date().setHours(0, 0, 0, 0));

    // Category breakdown for today
    const [categoryStats] = await sequelize.query(`
      SELECT category, COUNT(*) as count 
      FROM activity_logs 
      WHERE "createdAt" >= :today 
      GROUP BY category 
      ORDER BY count DESC
    `, { replacements: { today } });

    // Hourly activity for today
    const [hourlyActivity] = await sequelize.query(`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count 
      FROM activity_logs 
      WHERE "createdAt" >= :today 
      GROUP BY hour 
      ORDER BY hour
    `, { replacements: { today } });

    // Top active users today
    const [topUsers] = await sequelize.query(`
      SELECT "userId", "userName", "userEmail", COUNT(*) as count 
      FROM activity_logs 
      WHERE "createdAt" >= :today AND "userId" IS NOT NULL 
      GROUP BY "userId", "userName", "userEmail" 
      ORDER BY count DESC 
      LIMIT 10
    `, { replacements: { today } });

    // Most hit routes today
    const [topRoutes] = await sequelize.query(`
      SELECT route, action, description, COUNT(*) as count 
      FROM activity_logs 
      WHERE "createdAt" >= :today 
      GROUP BY route, action, description 
      ORDER BY count DESC 
      LIMIT 10
    `, { replacements: { today } });

    res.json({
      success: true,
      stats: {
        categoryBreakdown: categoryStats,
        hourlyActivity,
        topUsers,
        topRoutes
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching log stats', error: error.message });
  }
});

// Clear old logs (keep only last 30 days)
router.delete('/logs/cleanup', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { getActivityLogModel } = require('../models/ActivityLog');
    const ActivityLog = getActivityLogModel();

    const daysToKeep = parseInt(req.query.days) || 30;
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const deletedCount = await ActivityLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate }
      }
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} logs older than ${daysToKeep} days`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error cleaning up logs', error: error.message });
  }
});

module.exports = router;
