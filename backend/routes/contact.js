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
const { getContactMessageModel } = require('../models/ContactMessage');
const { getUserModel } = require('../models/User');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

const { validate, validationRules } = require('../middleware/validation');

// Submit contact message (public - no auth required)
router.post('/submit', validate(validationRules.contact), async (req, res) => {
  try {
    const ContactMessage = getContactMessageModel();
    const { name, email, hostelRoom, message, userId } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      hostelRoom: hostelRoom || null,
      message,
      userId: req.user ? req.user.id : null,
      status: 'pending'
    });

    console.log('✅ Contact message saved:', contactMessage.id);

    res.json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      contactId: contactMessage.id
    });
  } catch (error) {
    console.error('❌ Error saving contact message:', error);
    res.status(500).json({ success: false, message: 'Error sending message', error: error.message });
  }
});

// Get all contact messages (admin only)
router.get('/all', authMiddleware, isAdmin, async (req, res) => {
  try {
    const ContactMessage = getContactMessageModel();
    const User = getUserModel();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: messages } = await ContactMessage.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
        { model: User, as: 'respondedBy', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      messages,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages', error: error.message });
  }
});

// Update contact message status/response (admin only)
router.put('/update/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const ContactMessage = getContactMessageModel();
    const User = getUserModel();
    const { status, staffResponse } = req.body;

    const update = {};
    if (status) {
      update.status = status;
    }
    if (staffResponse) {
      update.staffResponse = staffResponse;
      update.respondedById = req.user.id;
      update.respondedAt = new Date();
    }

    await ContactMessage.update(update, { where: { id: req.params.id } });
    const message = await ContactMessage.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone'] }]
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    console.log('✅ Contact message updated:', message.id);

    res.json({ success: true, message: 'Message updated successfully', contactMessage: message });
  } catch (error) {
    console.error('❌ Error updating contact message:', error);
    res.status(500).json({ success: false, message: 'Error updating message', error: error.message });
  }
});

// Delete contact message (admin only)
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const ContactMessage = getContactMessageModel();
    const deleted = await ContactMessage.destroy({ where: { id: req.params.id } });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting contact message:', error);
    res.status(500).json({ success: false, message: 'Error deleting message', error: error.message });
  }
});

module.exports = router;
