const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addItem);
router.put('/items/:itemId', optionalAuth, cartController.updateItemQuantity);
router.delete('/items/:itemId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCart);

module.exports = router;
