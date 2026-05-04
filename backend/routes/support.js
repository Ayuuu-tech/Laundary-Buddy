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
const { getSupportTicketModel } = require('../models/SupportTicket');
const { getUserModel } = require('../models/User');
const { getOrderModel } = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const { validate, validationRules } = require('../middleware/validation');

// Submit support report
router.post('/report', authMiddleware, validate(validationRules.createTicket), async (req, res) => {
  try {
    const SupportTicket = getSupportTicketModel();
    const User = getUserModel();
    const Order = getOrderModel();
    const { type, orderNumber, orderId, items, damageType, details } = req.body;

    // Resolve orderId: use provided orderId, or look up by orderNumber
    let resolvedOrderId = orderId ? parseInt(orderId, 10) : null;
    if ((!resolvedOrderId || isNaN(resolvedOrderId)) && orderNumber) {
      const order = await Order.findOne({ where: { orderNumber } });
      if (order) {
        resolvedOrderId = order.id;
      }
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      orderNumber: orderNumber || null,
      orderId: resolvedOrderId || null,
      type,
      items,
      damageType,
      details,
      status: 'pending'
    });

    // Reload with associations
    const includeOptions = [
      { model: User, as: 'user', attributes: ['name', 'email', 'phone'] }
    ];
    if (resolvedOrderId) {
      includeOptions.push({ model: Order, as: 'order', attributes: ['orderNumber', 'items', 'createdAt'] });
    }

    const fullTicket = await SupportTicket.findByPk(ticket.id, {
      include: includeOptions
    });

    console.log('✅ Support ticket created:', ticket.id);

    res.json({ success: true, message: 'Report submitted successfully', ticket: fullTicket });
  } catch (error) {
    console.error('❌ Error creating support ticket:', error);
    res.status(500).json({ success: false, message: 'Error submitting report', error: error.message });
  }
});

// Get user's support tickets
router.get('/my-tickets', authMiddleware, async (req, res) => {
  try {
    const SupportTicket = getSupportTicketModel();
    const Order = getOrderModel();
    const tickets = await SupportTicket.findAll({
      where: { userId: req.user.id },
      include: [{ model: Order, as: 'order', attributes: ['orderNumber', 'items', 'createdAt'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'Error fetching tickets', error: error.message });
  }
});

// Get all support tickets (admin only)
router.get('/all-tickets', authMiddleware, isAdmin, async (req, res) => {
  try {
    const SupportTicket = getSupportTicketModel();
    const User = getUserModel();
    const Order = getOrderModel();
    const tickets = await SupportTicket.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone', 'address'] },
        { model: Order, as: 'order', attributes: ['orderNumber', 'items', 'createdAt', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('❌ Error fetching all tickets:', error);
    res.status(500).json({ success: false, message: 'Error fetching tickets', error: error.message });
  }
});

// Update ticket status (admin only)
router.put('/update-ticket/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const SupportTicket = getSupportTicketModel();
    const User = getUserModel();
    const Order = getOrderModel();
    const { status, response } = req.body;

    const update = { status };
    if (response) {
      update.response = response;
    }
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = new Date();
    }

    await SupportTicket.update(update, { where: { id: req.params.id } });
    const ticket = await SupportTicket.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
        { model: Order, as: 'order', attributes: ['orderNumber', 'items', 'createdAt'] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    console.log('✅ Support ticket updated:', ticket.id);

    res.json({ success: true, message: 'Ticket updated successfully', ticket });
  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    res.status(500).json({ success: false, message: 'Error updating ticket', error: error.message });
  }
});

module.exports = router;
