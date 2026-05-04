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

const { getTrackingModel } = require('../models/Tracking');
const { getOrderModel } = require('../models/Order');
const { getUserModel } = require('../models/User');
const { getSequelize } = require('../config/db');

// Get all tracking items for user
exports.getTrackingItems = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const Order = getOrderModel();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: tracking } = await Tracking.findAndCountAll({
      where: { userId: req.user.id },
      include: [{ model: Order, as: 'order' }],
      order: [['updatedAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      tracking,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tracking items', error: error.message });
  }
};

// Get single tracking item
exports.getTrackingItem = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const item = await Tracking.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Tracking item not found' });
    }
    res.json({ success: true, tracking: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching tracking item', error: error.message });
  }
};

// Create tracking item
exports.createTrackingItem = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const Order = getOrderModel();
    const {
      orderId,
      orderNumber,
      status,
      currentLocation,
      estimatedDelivery,
      timeline
    } = req.body;

    // resolve order id if provided
    let orderRef = undefined;
    if (orderId) {
      try {
        orderRef = await Order.findOne({ where: { id: orderId, userId: req.user.id } });
      } catch { }
    }
    const tracking = await Tracking.create({
      userId: req.user.id,
      orderId: orderRef?.id || null,
      orderNumber,
      status: status || 'picked_up',
      currentLocation,
      estimatedDelivery,
      timeline: timeline || []
    });

    res.status(201).json({ success: true, message: 'Tracking item created successfully', tracking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating tracking item', error: error.message });
  }
};

// Update tracking item
exports.updateTrackingItem = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const item = await Tracking.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Tracking item not found' });
    }

    const { status, currentLocation, estimatedDelivery, timeline } = req.body;
    const updateData = {};
    if (status) {
      updateData.status = status;
    }
    if (currentLocation) {
      updateData.currentLocation = currentLocation;
    }
    if (estimatedDelivery) {
      updateData.estimatedDelivery = estimatedDelivery;
    }
    if (timeline) {
      updateData.timeline = timeline;
    }

    await Tracking.update(updateData, { where: { id: req.params.id, userId: req.user.id } });
    const updatedTracking = await Tracking.findByPk(req.params.id);
    res.json({ success: true, message: 'Tracking updated successfully', tracking: updatedTracking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating tracking item', error: error.message });
  }
};

// Track order by order number
exports.trackByOrderNumber = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const Order = getOrderModel();
    const { orderNumber } = req.params;
    const item = await Tracking.findOne({
      where: { orderNumber },
      include: [{ model: Order, as: 'order' }]
    });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, tracking: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error tracking order', error: error.message });
  }
};

// Upsert tracking by order number for Laundry Dashboard
exports.upsertByOrderNumberForLaundry = async (req, res) => {
  const sequelize = getSequelize();
  const t = await sequelize.transaction();

  try {
    const Tracking = getTrackingModel();
    const Order = getOrderModel();
    const User = getUserModel();

    // Strictly require authenticated admin access
    if (!req.user || !req.user.id) {
      await t.rollback();
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check admin status from database
    const adminUser = await User.findByPk(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const { orderNumber } = req.params;
    const { status, estimatedDelivery, note } = req.body || {};

    if (!orderNumber) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'orderNumber is required' });
    }
    if (!status) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    // Try to link to an existing order to resolve user
    const order = await Order.findOne({ where: { orderNumber }, transaction: t });

    if (!order) {
      await t.rollback();
      console.warn('⚠️  Upsert failed: order not found for', orderNumber);
      return res.status(404).json({ success: false, message: 'Order not found for this token/orderNumber' });
    }

    const now = new Date();
    let tracking = await Tracking.findOne({ where: { orderNumber }, transaction: t });

    if (!tracking) {
      tracking = await Tracking.create({
        userId: order.userId,
        orderId: order.id,
        orderNumber,
        status,
        estimatedDelivery: estimatedDelivery || null,
        timeline: [{ status, timestamp: now, note: note || `Updated to ${status}` }]
      }, { transaction: t });
    } else {
      const timeline = tracking.timeline || [];
      timeline.push({ status, timestamp: now, note: note || `Updated to ${status}` });
      tracking.status = status;
      if (estimatedDelivery) {
        tracking.estimatedDelivery = estimatedDelivery;
      }
      tracking.timeline = timeline;
      // Force Sequelize to detect JSON change
      tracking.changed('timeline', true);
      await tracking.save({ transaction: t });
    }

    // Keep the Order document in sync with latest status
    console.log(`📦 Updating order ${order.id} status from "${order.status}" to "${status}"`);
    order.status = status;
    if (status === 'ready-for-pickup' || status === 'completed') {
      const d = estimatedDelivery ? new Date(estimatedDelivery) : now;
      const isoDate = new Date(d).toISOString().split('T')[0];
      order.deliveryDate = isoDate;
      console.log(`📅 Set deliveryDate to ${isoDate}`);

      // Check if user requested notification
      if (tracking.notifyWhenReady && (status === 'ready-for-pickup' || status === 'ready')) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);

          // Get user email
          const orderUser = await User.findByPk(order.userId);
          const userEmail = orderUser?.email;

          if (userEmail) {
            console.log(`📧 Sending 'Ready' notification email to ${userEmail}`);
            await resend.emails.send({
              from: 'Laundry Buddy <onboarding@resend.dev>',
              to: userEmail,
              subject: 'Message from Laundry Buddy: Your Order is Ready!',
              html: `<p>Hello!</p><p>Your laundry order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p><p>You can pick it up at your convenience.</p><p>Thanks,<br>Laundry Buddy Team</p>`
            });

            const timeline = tracking.timeline || [];
            timeline.push({ status: 'notification_sent', timestamp: new Date(), note: 'Email notification sent to user' });
            tracking.timeline = timeline;
            tracking.changed('timeline', true);
            await tracking.save({ transaction: t });
          }
        } catch (emailErr) {
          console.error('Failed to send notification email:', emailErr);
        }
      }
    }
    await order.save({ transaction: t });
    console.log(`✅ Order ${order.id} status updated to "${status}" successfully`);

    await t.commit();

    return res.json({ success: true, message: 'Tracking upserted', tracking });
  } catch (error) {
    await t.rollback();
    console.error('❌ Upsert tracking error:', error);
    return res.status(500).json({ success: false, message: 'Error updating tracking', error: error.message });
  }
};

// Toggle notification preference
exports.toggleNotifyWhenReady = async (req, res) => {
  try {
    const Tracking = getTrackingModel();
    const { orderNumber } = req.params;
    const tracking = await Tracking.findOne({ where: { orderNumber } });

    if (!tracking) {
      return res.status(404).json({ success: false, message: 'Tracking not found' });
    }

    const currentValue = tracking.notifyWhenReady || false;
    tracking.notifyWhenReady = !currentValue;
    await tracking.save();

    res.json({
      success: true,
      message: tracking.notifyWhenReady ? 'Notification enabled' : 'Notification disabled',
      tracking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling notification', error: error.message });
  }
};
