const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const { validate, validationRules } = require('../middleware/validation');

// Submit support report
router.post('/report', authMiddleware, validate(validationRules.createTicket), async (req, res) => {
  try {
    const { type, orderNumber, orderId, items, damageType, details } = req.body;

    const ticket = await SupportTicket.create({
      user: req.user.id,
      orderNumber,
      orderId,
      type,
      items,
      damageType,
      details,
      status: 'pending'
    });

    await ticket.populate('user', 'name email phone');
    await ticket.populate('orderId', 'orderNumber items createdAt');

    console.log('✅ Support ticket created:', ticket._id);

    res.json({
      success: true,
      message: 'Report submitted successfully',
      ticket
    });
  } catch (error) {
    console.error('❌ Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
});

// Get user's support tickets
router.get('/my-tickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id })
      .populate('orderId', 'orderNumber items createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
      error: error.message
    });
  }
});

// Get all support tickets (admin only)
router.get('/all-tickets', authMiddleware, isAdmin, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email phone address')
      .populate('orderId', 'orderNumber items createdAt status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('❌ Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
      error: error.message
    });
  }
});

// Update ticket status (admin only)
router.put('/update-ticket/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { status, response } = req.body;

    const update = { status };
    if (response) update.response = response;
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('user', 'name email phone')
      .populate('orderId', 'orderNumber items createdAt');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    console.log('✅ Support ticket updated:', ticket._id);

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ticket',
      error: error.message
    });
  }
});

module.exports = router;
