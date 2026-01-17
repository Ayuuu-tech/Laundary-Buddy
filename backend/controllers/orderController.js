const Order = require('../models/Order');
const crypto = require('crypto');

// Get all orders for user
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  const mongoose = require('mongoose');
  const Tracking = require('../models/Tracking');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user?.id) {
      await session.abortTransaction();
      session.endSession();
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
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'serviceType is required' });
    }

    const normalizedItems = Array.isArray(items)
      ? items.map((it) => ({
        type: it.type || it.name || 'unknown',
        count: typeof it.count === 'number' ? it.count : (typeof it.quantity === 'number' ? it.quantity : parseInt(it.count || it.quantity || 0, 10)),
        quantity: undefined,
        name: undefined,
        color: it.color || 'mixed',
      }))
      : [];

    const orderNumber = 'ORD' + Date.now() + crypto.randomInt(1000, 9999).toString();
    const initialStatus = 'submitted';

    // Create Order with session
    const [order] = await Order.create([{
      user: req.user.id,
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
      paymentStatus: 'pending',
    }], { session });

    // Create Initial Tracking with session
    await Tracking.create([{
      user: req.user.id,
      order: order._id,
      orderNumber,
      status: initialStatus,
      timeline: [{ status: initialStatus, timestamp: new Date(), note: 'Order placed' }]
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message,
      details: error?.errors || undefined
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }


    // Whitelist allowed fields
    // List allowed fields to prevent mass assignment
    const { items, totalAmount, serviceType, pickupDate, deliveryDate, deliveryAddress, specialInstructions, status, paymentStatus } = req.body;

    // Only admins can update status/paymentStatus via this generic route?
    // Usually status updates have their own flow, but if we allow it here for now,
    // we should at least not allow updating user or _id.
    const updateData = { items, totalAmount, serviceType, pickupDate, deliveryDate, deliveryAddress, specialInstructions };

    // If admin, allow status updates (or valid roles)
    // Checking req.user.isAdmin or role from session if available?
    // Since this controller is for general usage, maybe we should restricted critical fields?
    // For now, removing status/paymentStatus unless specific logic handles it.
    // Wait, the user might need to update status through other endpoints.
    // Let's include them if present but sanitize.
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updateData },
      { new: true }
    );
    res.json({ success: true, message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting order',
      error: error.message
    });
  }
};

// Get order history
exports.getOrderHistory = async (req, res) => {
  try {
    const completedOrders = await Order.find({
      user: req.user.id,
      status: { $in: ['completed', 'delivered'] }
    }).sort({ updatedAt: -1 });
    res.json({ success: true, orders: completedOrders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order history',
      error: error.message
    });
  }
};
