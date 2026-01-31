const Tracking = require('../models/Tracking');
const Order = require('../models/Order');

// Get all tracking items for user
exports.getTrackingItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tracking = await Tracking.find({ user: req.user.id })
      .populate('order')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Tracking.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      tracking,
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
      try { orderRef = await Order.findOne({ _id: orderId, user: req.user.id }); } catch { }
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

    const { status, currentLocation, estimatedDelivery, timeline } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (currentLocation) updateData.currentLocation = currentLocation;
    if (estimatedDelivery) updateData.estimatedDelivery = estimatedDelivery;
    if (timeline) updateData.timeline = timeline;

    const updatedTracking = await Tracking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      updateData,
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
    const item = await Tracking.findOne({ orderNumber }).populate('order');
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
// Upsert tracking by order number for Laundry Dashboard (secured via API key or dev mode)
exports.upsertByOrderNumberForLaundry = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Strictly require authenticated admin access
    if (!req.user || !req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Check admin status from database (session may not have isAdmin field)
    const adminUser = await require('../models/User').findById(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    const { orderNumber } = req.params;
    const { status, estimatedDelivery, note } = req.body || {};

    if (!orderNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'orderNumber is required' });
    }
    if (!status) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    // Try to link to an existing order to resolve user
    const order = await Order.findOne({ orderNumber }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
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

    let tracking = await Tracking.findOne({ orderNumber }).session(session);
    if (!tracking) {
      // Create new tracking doc
      // Model.create with session returns array unless using new Model + save
      const [newTracking] = await Tracking.create([{
        ...update,
        timeline: [{ status, timestamp: now, note: note || `Updated to ${status}` }],
      }], { session });
      tracking = newTracking;
    } else {
      const timeline = tracking.timeline || [];
      timeline.push({ status, timestamp: now, note: note || `Updated to ${status}` });
      tracking.status = status;
      if (estimatedDelivery) tracking.estimatedDelivery = estimatedDelivery;
      tracking.timeline = timeline;
      await tracking.save({ session });
    }

    // Keep the Order document in sync with latest status
    console.log(`📦 Updating order ${order._id} status from "${order.status}" to "${status}"`);
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
          const userEmail = order.userEmail;

          if (userEmail) {
            console.log(`📧 Sending 'Ready' notification email to ${userEmail}`);
            await resend.emails.send({
              from: 'Laundry Buddy <onboarding@resend.dev>',
              to: userEmail,
              subject: 'Message from Laundry Buddy: Your Order is Ready!',
              html: `<p>Hello!</p><p>Your laundry order <strong>${orderNumber}</strong> is now <strong>${status}</strong>.</p><p>You can pick it up at your convenience.</p><p>Thanks,<br>Laundry Buddy Team</p>`
            });

            // Add note to timeline
            const timeline = tracking.timeline || [];
            timeline.push({ status: 'notification_sent', timestamp: new Date(), note: 'Email notification sent to user' });
            tracking.timeline = timeline;
            await tracking.save({ session });
          }
        } catch (emailErr) {
          console.error('Failed to send notification email:', emailErr);
          // Don't fail the transaction just for email
        }
      }
    }
    await order.save({ session });
    console.log(`✅ Order ${order._id} status updated to "${status}" successfully`);

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: 'Tracking upserted', tracking });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Upsert tracking error:', error);
    return res.status(500).json({ success: false, message: 'Error updating tracking', error: error.message });
  }
};

// Toggle notification preference
exports.toggleNotifyWhenReady = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const tracking = await Tracking.findOne({ orderNumber });

    if (!tracking) {
      return res.status(404).json({ success: false, message: 'Tracking not found' });
    }

    // Toggle the value (default is false if undefined)
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
