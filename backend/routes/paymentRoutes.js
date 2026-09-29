const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { checkoutLimiter } = require('../middleware/rateLimiter');

router.post('/initiate', checkoutLimiter, paymentController.initiatePayment);
router.post('/verify', checkoutLimiter, paymentController.verifyPayment);
router.post('/webhook', paymentController.webhook);

module.exports = router;
