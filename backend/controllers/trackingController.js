const { v4: uuidv4 } = require('uuid');
const Tracking = require('../models/Tracking');
const Order = require('../models/Order');

// Get all tracking items for user
exports.getTrackingItems = async (req, res) => {
  try {
    console.log('↪️  Upsert tracking request:', req.params?.orderNumber, req.body);
    const tracking = await Tracking.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, tracking });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching tracking items', 
      error: error.message 
    });
  }
};

// Get single tracking item
exports.getTrackingItem = async (req, res) => {
  try {
    const item = await Tracking.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracking item not found' 
      });
    }
    res.json({ success: true, tracking: item });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching tracking item', 
      error: error.message 
    });
  }
};

// Create tracking item
exports.createTrackingItem = async (req, res) => {
  try {
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
      try { orderRef = await Order.findOne({ _id: orderId, user: req.user.id }); } catch {}
    }
    const tracking = await Tracking.create({
      user: req.user.id,
      order: orderRef?._id,
      orderNumber,
      status: status || 'picked_up',
      currentLocation,
      estimatedDelivery,
      timeline: timeline || [],
    });

    res.status(201).json({ success: true, message: 'Tracking item created successfully', tracking });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating tracking item', 
      error: error.message 
    });
  }
};

// Update tracking item
exports.updateTrackingItem = async (req, res) => {
  try {
    const item = await Tracking.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tracking item not found' 
      });
    }
    const updatedTracking = await Tracking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body },
      { new: true }
    );
    res.json({ success: true, message: 'Tracking updated successfully', tracking: updatedTracking });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating tracking item', 
      error: error.message 
    });
  }
};

// Track order by order number
exports.trackByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const item = await Tracking.findOne({ orderNumber });
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    res.json({ success: true, tracking: item });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error tracking order', 
      error: error.message 
    });
  }
};

// Upsert tracking by order number for Laundry Dashboard (secured via API key or dev mode)
exports.upsertByOrderNumberForLaundry = async (req, res) => {
  try {
    const providedKey = req.headers['x-laundry-key'] || req.query.key;
    const requiredKey = process.env.LAUNDRY_API_KEY;
    const nodeEnv = process.env.NODE_ENV;
    const isDev = (nodeEnv || 'development') !== 'production';
    console.log('[DEBUG] NODE_ENV:', nodeEnv, '| isDev:', isDev, '| providedKey:', providedKey, '| requiredKey:', requiredKey);

    if (!isDev) {
      if (!requiredKey || providedKey !== requiredKey) {
        console.log('[DEBUG] Unauthorized: Key mismatch or missing');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }

    const { orderNumber } = req.params;
    const { status, estimatedDelivery, note } = req.body || {};
    console.log('📋 Upsert tracking request:', { orderNumber, status, estimatedDelivery, note });
    
    if (!orderNumber) return res.status(400).json({ success: false, message: 'orderNumber is required' });
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    // Try to link to an existing order to resolve user
    const order = await Order.findOne({ orderNumber });
    console.log('🔍 Found order:', order ? order._id : 'NOT FOUND');
    
    if (!order) {
      console.warn('⚠️  Upsert failed: order not found for', orderNumber);
      return res.status(404).json({ success: false, message: 'Order not found for this token/orderNumber' });
    }

    const now = new Date();
    const update = {
      user: order.user,
      order: order._id,
      orderNumber,
      status,
      estimatedDelivery: estimatedDelivery || undefined,
    };

    let tracking = await Tracking.findOne({ orderNumber });
    if (!tracking) {
      tracking = await Tracking.create({
        ...update,
        timeline: [{ status, timestamp: now, note: note || `Updated to ${status}` }],
      });
    } else {
      const timeline = tracking.timeline || [];
      timeline.push({ status, timestamp: now, note: note || `Updated to ${status}` });
      tracking.status = status;
      if (estimatedDelivery) tracking.estimatedDelivery = estimatedDelivery;
      tracking.timeline = timeline;
      await tracking.save();
    }

    // Keep the Order document in sync with latest status
    try {
      console.log(`📦 Updating order ${order._id} status from "${order.status}" to "${status}"`);
      order.status = status;
      if (status === 'ready-for-pickup' || status === 'completed') {
        // If estimated delivery provided, prefer it; else set to now
        const d = estimatedDelivery ? new Date(estimatedDelivery) : now;
        // Store ISO date string (yyyy-mm-dd) to match existing format field
        const isoDate = new Date(d).toISOString().split('T')[0];
        order.deliveryDate = isoDate;
        console.log(`📅 Set deliveryDate to ${isoDate}`);
      }
      await order.save();
      console.log(`✅ Order ${order._id} status updated to "${status}" successfully`);
    } catch (err) {
      console.error('❌ Failed to update order status:', err);
    }

    console.log('✅ Tracking upserted', { orderNumber, status, trackingId: tracking._id.toString() });
    return res.json({ success: true, message: 'Tracking upserted', tracking });
  } catch (error) {
    console.error('❌ Upsert tracking error:', error);
    return res.status(500).json({ success: false, message: 'Error updating tracking', error: error.message });
  }
};
