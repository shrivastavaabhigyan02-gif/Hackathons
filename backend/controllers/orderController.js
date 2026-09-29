const Order = require('../models/Order');
const schedulingService = require('../services/schedulingService');
const notificationService = require('../services/notificationService');

const orderController = {
  async createOrder(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const {
        order_type,
        customer_name,
        customer_email,
        customer_phone,
        items,
        coupon_code,
        delivery_address,
        table_number,
        pickup_time,
        is_scheduled,
        scheduled_for,
        special_instructions,
        tip
      } = req.body;

      // Validate scheduling if requested
      let validatedScheduleTime = null;
      if (is_scheduled) {
        const scheduleCheck = schedulingService.validateScheduleTime(scheduled_for);
        if (!scheduleCheck.valid) {
          return res.status(400).json({
            success: false,
            message: scheduleCheck.message,
            code: 'INVALID_SCHEDULE_TIME'
          });
        }
        validatedScheduleTime = scheduleCheck.scheduledDate;
      }

      const order = await Order.create({
        userId,
        orderType: order_type,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        items,
        couponCode: coupon_code,
        deliveryAddress: delivery_address,
        tableNumber: table_number,
        pickupTime: pickup_time,
        isScheduled: is_scheduled || false,
        scheduledFor: validatedScheduleTime,
        specialInstructions: special_instructions,
        tip: tip || 0
      });

      // Send dispatch notification
      await notificationService.sendOrderNotification({
        userId,
        orderNumber: order.order_number,
        type: 'order_placed',
        customerEmail: customer_email,
        customerPhone: customer_phone,
        message: `Your order #${order.order_number} for ₹${order.total} has been placed successfully!`
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        order
      });
    } catch (err) {
      next(err);
    }
  },

  async getOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await Order.getById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // Security check: If authenticated customer, ensure order belongs to them
      if (req.user && req.user.role === 'customer' && order.user_id && order.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this order.',
          code: 'FORBIDDEN'
        });
      }

      res.json({
        success: true,
        order
      });
    } catch (err) {
      next(err);
    }
  },

  async getByOrderNumber(req, res, next) {
    try {
      const { orderNumber } = req.params;
      const order = await Order.getByOrderNumber(orderNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        order
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyOrders(req, res, next) {
    try {
      const orders = await Order.getUserOrders(req.user.id);
      res.json({
        success: true,
        orders
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.getById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // Can only cancel if placed or accepted
      if (!['placed', 'accepted'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled in '${order.status}' stage as kitchen preparation has begun.`,
          code: 'CANNOT_CANCEL'
        });
      }

      const updated = await Order.updateStatus(id, 'cancelled', reason || 'Cancelled by customer', req.user ? req.user.full_name : 'customer');

      res.json({
        success: true,
        message: 'Order has been cancelled.',
        order: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async reorder(req, res, next) {
    try {
      const { id } = req.params;
      const previousOrder = await Order.getById(id);

      if (!previousOrder) {
        return res.status(404).json({
          success: false,
          message: 'Previous order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // Check current availability of past items
      const itemsToReorder = [];
      const unavailable = [];

      for (const item of previousOrder.items || []) {
        itemsToReorder.push({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          customizations: item.customizations,
          special_instructions: item.special_instructions
        });
      }

      res.json({
        success: true,
        items: itemsToReorder,
        unavailable_items: unavailable,
        message: 'Items prepared for reorder.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = orderController;
