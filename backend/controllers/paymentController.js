const paymentService = require('../services/paymentService');
const Order = require('../models/Order');

const paymentController = {
  async initiatePayment(req, res, next) {
    try {
      const { orderId, paymentMethod } = req.body;

      if (!orderId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'orderId and paymentMethod are required.',
          code: 'MISSING_PAYMENT_PARAMS'
        });
      }

      const order = await Order.getById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      const session = await paymentService.createPaymentSession({
        orderId: order.id,
        amount: order.total,
        paymentMethod,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone
      });

      res.json({
        success: true,
        session
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyPayment(req, res, next) {
    try {
      const { orderId, paymentId, transactionId, status } = req.body;

      const result = await paymentService.verifyPayment({
        paymentId,
        transactionId,
        status: status || 'successful'
      });

      if (result.success) {
        // Mark order payment status as successful
        const updatedOrder = await Order.updatePaymentStatus(orderId, 'successful', transactionId);
        return res.json({
          success: true,
          message: 'Payment verified and confirmed.',
          order: updatedOrder
        });
      } else {
        await Order.updatePaymentStatus(orderId, 'failed', transactionId);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed.',
          code: 'PAYMENT_FAILED'
        });
      }
    } catch (err) {
      next(err);
    }
  },

  async webhook(req, res) {
    try {
      const signature = req.headers['x-flame-signature'];
      const payload = req.body;

      // Validate webhook signature
      if (!paymentService.validateWebhookSignature(payload, signature)) {
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }

      const { event, order_id, transaction_id, status } = payload;
      if (event === 'payment.captured' && order_id) {
        await Order.updatePaymentStatus(order_id, 'successful', transaction_id);
      }

      res.json({ received: true });
    } catch (err) {
      res.status(500).json({ error: 'Webhook processing error.' });
    }
  }
};

module.exports = paymentController;
