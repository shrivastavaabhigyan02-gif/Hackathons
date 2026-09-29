const Cart = require('../models/Cart');

const cartController = {
  async getCart(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || req.query.session_id || 'guest_session';
      const couponCode = req.query.coupon || null;
      const orderType = req.query.order_type || 'delivery';

      const cart = await Cart.getOrCreateCart(userId, sessionId);
      const details = await Cart.getCartDetails(cart.id, couponCode, orderType);

      res.json({
        success: true,
        cart: details
      });
    } catch (err) {
      next(err);
    }
  },

  async addItem(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || req.body.session_id || 'guest_session';
      const { menuItemId, quantity, customizations, specialInstructions } = req.body;

      if (!menuItemId) {
        return res.status(400).json({
          success: false,
          message: 'menuItemId is required.',
          code: 'INVALID_INPUT'
        });
      }

      const cart = await Cart.getOrCreateCart(userId, sessionId);
      await Cart.addItem(cart.id, {
        menuItemId,
        quantity: quantity || 1,
        customizations: customizations || [],
        specialInstructions: specialInstructions || ''
      });

      const updated = await Cart.getCartDetails(cart.id);

      res.status(201).json({
        success: true,
        message: 'Item added to cart.',
        cart: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async updateItemQuantity(req, res, next) {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      await Cart.updateItemQuantity(itemId, quantity);

      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || 'guest_session';
      const cart = await Cart.getOrCreateCart(userId, sessionId);
      const updated = await Cart.getCartDetails(cart.id);

      res.json({
        success: true,
        message: 'Cart updated.',
        cart: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async removeItem(req, res, next) {
    try {
      const { itemId } = req.params;
      await Cart.removeItem(itemId);

      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || 'guest_session';
      const cart = await Cart.getOrCreateCart(userId, sessionId);
      const updated = await Cart.getCartDetails(cart.id);

      res.json({
        success: true,
        message: 'Item removed from cart.',
        cart: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async clearCart(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || 'guest_session';
      const cart = await Cart.getOrCreateCart(userId, sessionId);
      await Cart.clearCart(cart.id);

      res.json({
        success: true,
        message: 'Cart cleared.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = cartController;
