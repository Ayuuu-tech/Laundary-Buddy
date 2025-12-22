const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const authMiddleware = require('../middleware/auth');

// Submit contact message (public - no auth required)
router.post('/submit', async (req, res) => {
  try {
    const { name, email, hostelRoom, message, userId } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and message are required'
      });
    }
    
    const contactMessage = await ContactMessage.create({
      name,
      email,
      hostelRoom: hostelRoom || null,
      message,
      user: userId || null,
      status: 'pending'
    });
    
    console.log('✅ Contact message saved:', contactMessage._id);
    
    res.json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.',
      contactId: contactMessage._id
    });
  } catch (error) {
    console.error('❌ Error saving contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// Get all contact messages (admin only)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .populate('user', 'name email phone')
      .populate('respondedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// Update contact message status/response (admin only)
router.put('/update/:id', authMiddleware, async (req, res) => {
  try {
    const { status, staffResponse } = req.body;
    
    const update = {};
    if (status) update.status = status;
    if (staffResponse) {
      update.staffResponse = staffResponse;
      update.respondedBy = req.user.id;
      update.respondedAt = new Date();
    }
    
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('user', 'name email phone');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    console.log('✅ Contact message updated:', message._id);
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      contactMessage: message
    });
  } catch (error) {
    console.error('❌ Error updating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating message',
      error: error.message
    });
  }
});

// Delete contact message (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
});

module.exports = router;
