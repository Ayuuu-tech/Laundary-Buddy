const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get VAPID Public Key
router.get('/config', notificationController.getVapidPublicKey);

// Subscribe to notifications
router.post('/subscribe', authMiddleware, notificationController.subscribe);

module.exports = router;
