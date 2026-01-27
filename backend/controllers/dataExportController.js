// Data Export Controller
// Add this to backend/controllers/dataExportController.js

const User = require('../models/User');
const Order = require('../models/Order');
const Tracking = require('../models/Tracking');

/**
 * Export user data (GDPR compliance)
 * GET /api/user/export-data
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId).select('-password -refreshTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get all orders
    const orders = await Order.find({ userId });
    
    // Get tracking history
    const trackingHistory = await Tracking.find({ userId });
    
    // Compile all data
    const userData = {
      exportDate: new Date().toISOString(),
      account: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        lastLoginIP: user.lastLoginIP
      },
      orders: orders.map(order => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        completedAt: order.completedAt
      })),
      trackingHistory: trackingHistory.map(track => ({
        trackingNumber: track.trackingNumber,
        status: track.status,
        updates: track.updates,
        createdAt: track.createdAt
      }))
    };
    
    // Log the export request
    const SecurityLog = require('../models/SecurityLog');
    await SecurityLog.create({
      userId,
      event: 'DATA_EXPORT_REQUEST',
      metadata: { ipAddress: req.ip },
      timestamp: new Date()
    });
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=laundry-buddy-data-${userId}-${Date.now()}.json`);
    
    res.json(userData);
    
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

/**
 * Delete user account and all associated data
 * DELETE /api/user/delete-account
 */
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmDeletion } = req.body;
    
    // Require explicit confirmation
    if (confirmDeletion !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm deletion'
      });
    }
    
    // Verify password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }
    
    // Log the deletion request
    const SecurityLog = require('../models/SecurityLog');
    await SecurityLog.create({
      userId,
      event: 'ACCOUNT_DELETION_REQUEST',
      metadata: { 
        ipAddress: req.ip,
        email: user.email 
      },
      timestamp: new Date()
    });
    
    // Delete all associated data
    await Order.deleteMany({ userId });
    await Tracking.deleteMany({ userId });
    await SecurityLog.updateMany(
      { userId },
      { $set: { userId: null, metadata: { deletedUser: true } } }
    );
    
    // Delete user account
    await User.findByIdAndDelete(userId);
    
    // Destroy session
    req.session.destroy();
    
    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    });
    
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

/**
 * Request account deletion (for review/compliance)
 * POST /api/user/request-deletion
 */
const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Mark account for deletion (to be processed by admin/automated job)
    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    user.deletionReason = reason || 'Not specified';
    await user.save();
    
    // Log the request
    const SecurityLog = require('../models/SecurityLog');
    await SecurityLog.create({
      userId,
      event: 'ACCOUNT_DELETION_REQUESTED',
      metadata: { 
        ipAddress: req.ip,
        reason 
      },
      timestamp: new Date()
    });
    
    // Send confirmation email
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: 'Account Deletion Request Received',
        text: `Hello ${user.name},\n\nWe have received your request to delete your Laundry Buddy account.\n\nYour account will be permanently deleted within 30 days. During this period, you can cancel the deletion request by logging in.\n\nIf you have any questions, please contact support@laundrybuddy.com.\n\nThank you,\nLaundry Buddy Team`,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Account Deletion Request</h2>
          <p>Hello ${user.name},</p>
          <p>We have received your request to delete your Laundry Buddy account.</p>
          <p><strong>Your account will be permanently deleted within 30 days.</strong></p>
          <p>During this period, you can cancel the deletion request by logging in to your account.</p>
          <p>If you have any questions, please contact support@laundrybuddy.com.</p>
          <p>Thank you,<br>Laundry Buddy Team</p>
        </div>`
      });
    } catch (emailError) {
      console.error('Failed to send deletion confirmation email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Account deletion has been scheduled. Your account will be deleted within 30 days. You can cancel this request by logging in.'
    });
    
  } catch (error) {
    console.error('Deletion request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deletion request',
      error: error.message
    });
  }
};

module.exports = {
  exportUserData,
  deleteUserAccount,
  requestAccountDeletion
};
