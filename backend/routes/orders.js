const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.get('/', orderController.getOrders);
router.get('/my-orders', orderController.getOrders); // Alias for getting current user's orders
router.get('/history', orderController.getOrderHistory);
router.get('/:id', orderController.getOrder);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
