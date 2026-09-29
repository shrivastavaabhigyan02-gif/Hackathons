const supabase = require('../config/supabase');
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Reservation = require('../models/Reservation');
const Coupon = require('../models/Coupon');

const adminController = {
  // Comprehensive Analytics & Metrics
  async getDashboardStats(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all orders
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (ordersError) throw ordersError;

      const orders = allOrders || [];
      const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(today));

      const totalRevenue = orders
        .filter(o => o.payment_status === 'successful' || o.order_type === 'dine_in' || o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      const todayRevenue = todayOrders
        .filter(o => o.payment_status === 'successful' || o.order_type === 'dine_in' || o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      const pendingCount = orders.filter(o => o.status === 'placed' || o.status === 'accepted').length;
      const preparingCount = orders.filter(o => o.status === 'preparing').length;
      const readyCount = orders.filter(o => o.status === 'ready').length;
      const completedCount = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
      const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

      // Reservations count
      const { count: resCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('reservation_date', today);

      // Order type breakdown
      const deliveryCount = orders.filter(o => o.order_type === 'delivery').length;
      const pickupCount = orders.filter(o => o.order_type === 'pickup').length;
      const dineInCount = orders.filter(o => o.order_type === 'dine_in').length;

      // Average order value
      const validOrdersCount = orders.filter(o => o.status !== 'cancelled').length;
      const aov = validOrdersCount > 0 ? Math.round(totalRevenue / validOrdersCount) : 0;

      // Recent 7 days trend
      const salesLast7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const dayRevenue = orders
          .filter(o => o.created_at && o.created_at.startsWith(dayStr) && o.status !== 'cancelled')
          .reduce((sum, o) => sum + Number(o.total || 0), 0);
        salesLast7Days.push({
          date: dayStr,
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: Math.round(dayRevenue)
        });
      }

      res.json({
        success: true,
        stats: {
          total_revenue: Math.round(totalRevenue),
          today_revenue: Math.round(todayRevenue),
          total_orders: orders.length,
          today_orders: todayOrders.length,
          pending_orders: pendingCount,
          preparing_orders: preparingCount,
          ready_orders: readyCount,
          completed_orders: completedCount,
          cancelled_orders: cancelledCount,
          today_reservations: resCount || 0,
          average_order_value: aov,
          fulfillment_distribution: {
            delivery: deliveryCount,
            pickup: pickupCount,
            dine_in: dineInCount
          },
          sales_trend: salesLast7Days
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Live Orders Board (Kanban / KDS)
  async getLiveOrders(req, res, next) {
    try {
      const orders = await Order.getAllOrders({ limit: 100 });
      res.json({
        success: true,
        orders
      });
    } catch (err) {
      next(err);
    }
  },

  // Update Order Status (Advance state machine)
  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }

      const updated = await Order.updateStatus(id, status, notes, req.user ? req.user.full_name : 'Staff');

      res.json({
        success: true,
        message: `Order #${updated.order_number} status updated to ${status}.`,
        order: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // Menu Management
  async addMenuItem(req, res, next) {
    try {
      const item = await Menu.createItem(req.body);
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully.',
        item
      });
    } catch (err) {
      next(err);
    }
  },

  async updateMenuItem(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await Menu.updateItem(id, req.body);
      res.json({
        success: true,
        message: 'Menu item updated.',
        item: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleItemAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { is_available } = req.body;
      const updated = await Menu.toggleAvailability(id, is_available);
      res.json({
        success: true,
        message: `Item availability set to ${is_available ? 'In Stock' : 'Sold Out'}.`,
        item: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteMenuItem(req, res, next) {
    try {
      const { id } = req.params;
      await Menu.deleteItem(id);
      res.json({
        success: true,
        message: 'Menu item removed.'
      });
    } catch (err) {
      next(err);
    }
  },

  // Reservations
  async getReservations(req, res, next) {
    try {
      const { date, status } = req.query;
      const reservations = await Reservation.getAllReservations({ date, status });
      res.json({
        success: true,
        reservations
      });
    } catch (err) {
      next(err);
    }
  },

  async updateReservationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await Reservation.updateStatus(id, status);
      res.json({
        success: true,
        message: `Reservation status updated to ${status}.`,
        reservation: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // Coupons Admin
  async getCoupons(req, res, next) {
    try {
      const coupons = await Coupon.getAll();
      res.json({
        success: true,
        coupons
      });
    } catch (err) {
      next(err);
    }
  },

  async createCoupon(req, res, next) {
    try {
      const coupon = await Coupon.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Coupon created successfully.',
        coupon
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleCoupon(req, res, next) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const updated = await Coupon.update(id, { is_active });
      res.json({
        success: true,
        message: `Coupon ${is_active ? 'activated' : 'deactivated'}.`,
        coupon: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
