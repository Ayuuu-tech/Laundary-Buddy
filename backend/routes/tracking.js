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
const trackingController = require('../controllers/trackingController');
const authMiddleware = require('../middleware/auth');

// Public route for tracking by order number
router.get('/order/:orderNumber', trackingController.trackByOrderNumber);
// Laundry dashboard upsert by order number (API key protected in production)
router.put('/order/:orderNumber', authMiddleware, trackingController.upsertByOrderNumberForLaundry);

// Protected routes
router.use(authMiddleware);
router.get('/', trackingController.getTrackingItems);
router.get('/:id', trackingController.getTrackingItem);
router.post('/', trackingController.createTrackingItem);
router.post('/notify/:orderNumber', trackingController.toggleNotifyWhenReady);
router.put('/:id', trackingController.updateTrackingItem);

module.exports = router;
