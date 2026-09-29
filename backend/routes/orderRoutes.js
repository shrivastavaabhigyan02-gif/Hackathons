const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { checkoutLimiter } = require('../middleware/rateLimiter');
const { validateOrderCreation } = require('../middleware/validator');

router.post('/', checkoutLimiter, optionalAuth, validateOrderCreation, orderController.createOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);
router.get('/:id', optionalAuth, orderController.getOrder);
router.get('/number/:orderNumber', optionalAuth, orderController.getByOrderNumber);
router.post('/:id/cancel', optionalAuth, orderController.cancelOrder);
router.get('/:id/reorder', optionalAuth, orderController.reorder);

module.exports = router;
