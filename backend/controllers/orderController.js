const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');

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
  try {
    if (!req.user?.id) {
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

    // Basic validation
    if (!serviceType) {
      return res.status(400).json({ success: false, message: 'serviceType is required' });
    }

    // Normalize items to match schema (supports both {type,count} and {name,quantity})
    const normalizedItems = Array.isArray(items)
      ? items.map((it) => ({
          type: it.type || it.name || 'unknown',
          count: typeof it.count === 'number' ? it.count : (typeof it.quantity === 'number' ? it.quantity : parseInt(it.count || it.quantity || 0, 10)),
          quantity: undefined, // prevent extra field if passed
          name: undefined,
          color: it.color || 'mixed',
        }))
      : [];

    const order = await Order.create({
      user: req.user.id,
      orderNumber: 'ORD' + Date.now(),
      serviceType,
      pickupDate,
      pickupTime,
      deliveryDate,
      items: normalizedItems,
      totalAmount,
      address,
      phone,
      specialInstructions,
      status: 'pending',
      paymentStatus: 'pending',
    });

    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
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
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body },
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
