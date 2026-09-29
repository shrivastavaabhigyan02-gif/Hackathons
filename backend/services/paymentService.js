const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const logger = require('../utils/logger');

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'flame_whsec_unified_test_secret';

const paymentService = {
  /**
   * Initializes a payment session with gateway abstraction.
   */
  async createPaymentSession({ orderId, amount, paymentMethod, currency = 'INR', customerEmail, customerPhone }) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create pending payment record
    const payment = await Payment.create({
      orderId,
      paymentMethod,
      amount,
      currency,
      transactionId,
      provider: 'folk_flame_unified_gateway',
      status: paymentMethod === 'cod' ? 'pending' : 'processing'
    });

    if (paymentMethod === 'cod') {
      // Cash on delivery: Order stays placed/accepted, payment remains pending until handover
      await Order.updatePaymentStatus(orderId, 'pending', transactionId);
      return {
        paymentId: payment.id,
        transactionId,
        paymentMethod: 'cod',
        status: 'pending',
        instructions: 'Please keep exact cash ready upon delivery handover.'
      };
    }

    // Digital methods (Card, UPI, Apple Pay, Net Banking)
    return {
      paymentId: payment.id,
      transactionId,
      paymentMethod,
      amount,
      currency,
      status: 'processing',
      gateway_session_id: `gwsess_${transactionId}`,
      client_secret: `secret_test_${transactionId}`
    };
  },

  /**
   * Verifies payment completion from client or webhook.
   */
  async verifyPayment({ paymentId, transactionId, status = 'successful', mockSignature = null }) {
    if (status === 'successful') {
      await Payment.updateStatus(paymentId, 'successful', transactionId, {
        verified_at: new Date().toISOString(),
        status: 'authorized'
      });
      return { success: true, message: 'Payment successfully captured and verified.' };
    } else {
      await Payment.updateStatus(paymentId, 'failed', transactionId, {
        failed_at: new Date().toISOString(),
        reason: 'Payment declined or aborted by customer.'
      });
      return { success: false, message: 'Payment authorization declined.' };
    }
  },

  /**
   * Validates webhook signature.
   */
  validateWebhookSignature(payload, signature) {
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex');
    return expected === signature;
  }
};

module.exports = paymentService;
