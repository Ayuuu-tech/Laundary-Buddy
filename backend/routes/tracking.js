const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const authMiddleware = require('../middleware/auth');

// All tracking routes require authentication
router.use(authMiddleware);

// Track by order number
router.get('/order/:orderNumber', trackingController.trackByOrderNumber);

// Laundry dashboard upsert by order number (admin-only verified inside controller)
router.put('/order/:orderNumber', trackingController.upsertByOrderNumberForLaundry);

// CRUD routes
router.get('/', trackingController.getTrackingItems);
router.get('/:id', trackingController.getTrackingItem);
router.post('/', trackingController.createTrackingItem);
router.post('/notify/:orderNumber', trackingController.toggleNotifyWhenReady);
router.put('/:id', trackingController.updateTrackingItem);

module.exports = router;
