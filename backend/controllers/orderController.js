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

const { getOrderModel } = require('../models/Order');
const { getTrackingModel } = require('../models/Tracking');
const { getSequelize } = require('../config/db');
const crypto = require('crypto');

// Get all orders for user
exports.getOrders = async (req, res) => {
  try {
    const Order = getOrderModel();
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const Order = getOrderModel();
    const order = await Order.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  const sequelize = getSequelize();
  const t = await sequelize.transaction();

  try {
    const Order = getOrderModel();
    const Tracking = getTrackingModel();

    if (!req.user?.id) {
      await t.rollback();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      serviceType,
      pickupDate,
      pickupTime,
      deliveryDate,
      items = [],
      totalAmount,
      address,
      phone,
      specialInstructions
    } = req.body || {};

    if (!serviceType) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'serviceType is required' });
    }

    const normalizedItems = Array.isArray(items)
      ? items.map((it) => ({
        type: it.type || it.name || 'unknown',
        count: typeof it.count === 'number' ? it.count : (typeof it.quantity === 'number' ? it.quantity : parseInt(it.count || it.quantity || 0, 10)),
        color: it.color || 'mixed'
      }))
      : [];

    const orderNumber = 'ORD' + Date.now() + crypto.randomInt(1000, 9999).toString();
    const initialStatus = 'submitted';

    // Create Order with transaction
    const order = await Order.create({
      userId: req.user.id,
      orderNumber,
      serviceType,
      pickupDate,
      pickupTime,
      deliveryDate,
      items: normalizedItems,
      totalAmount: normalizedItems.reduce((sum, item) => sum + (item.count * 10), 0),
      address,
      phone,
      specialInstructions,
      status: initialStatus,
      paymentStatus: 'pending'
    }, { transaction: t });

    // Create Initial Tracking with transaction
    await Tracking.create({
      userId: req.user.id,
      orderId: order.id,
      orderNumber,
      status: initialStatus,
      timeline: [{ status: initialStatus, timestamp: new Date(), note: 'Order placed' }]
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const Order = getOrderModel();
    const order = await Order.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { items, totalAmount, serviceType, pickupDate, deliveryDate, deliveryAddress, specialInstructions, status, paymentStatus, feedback } = req.body;

    const updateData = {};
    if (items !== undefined) {
      updateData.items = items;
    }
    if (totalAmount !== undefined) {
      updateData.totalAmount = totalAmount;
    }
    if (serviceType !== undefined) {
      updateData.serviceType = serviceType;
    }
    if (pickupDate !== undefined) {
      updateData.pickupDate = pickupDate;
    }
    if (deliveryDate !== undefined) {
      updateData.deliveryDate = deliveryDate;
    }
    if (specialInstructions !== undefined) {
      updateData.specialInstructions = specialInstructions;
    }
    if (status) {
      updateData.status = status;
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (feedback) {
      if (feedback.rating) {
        updateData.feedbackRating = feedback.rating;
      }
      if (feedback.comment) {
        updateData.feedbackComment = feedback.comment;
      }
      updateData.feedbackSubmittedAt = new Date();
    }

    await Order.update(updateData, { where: { id: req.params.id, userId: req.user.id } });
    const updatedOrder = await Order.findByPk(req.params.id);

    // Send Push Notification if status changed
    if (status && status !== order.status) {
      const notificationController = require('./notificationController');
      try {
        await notificationController.sendNotificationToUser(order.userId, {
          title: 'Order Updated',
          body: `Your order #${order.orderNumber} status is now: ${status}`,
          url: `/track.html?id=${order.id}`
        });
      } catch (notifyErr) {
        console.error('Failed to send push notification:', notifyErr);
      }
    }

    res.json({ success: true, message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const Order = getOrderModel();
    const deleted = await Order.destroy({ where: { id: req.params.id, userId: req.user.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting order', error: error.message });
  }
};

// Get order history
exports.getOrderHistory = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const Order = getOrderModel();
    const completedOrders = await Order.findAll({
      where: {
        userId: req.user.id,
        status: { [Op.in]: ['completed', 'delivered'] }
      },
      order: [['updatedAt', 'DESC']]
    });
    res.json({ success: true, orders: completedOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order history', error: error.message });
  }
};
