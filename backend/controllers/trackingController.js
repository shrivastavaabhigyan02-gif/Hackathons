const supabase = require('../config/supabase');
const Order = require('../models/Order');

const trackingController = {
  async getOrderTracking(req, res, next) {
    try {
      const { orderId } = req.params;

      const order = await Order.getById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          code: 'ORDER_NOT_FOUND'
        });
      }

      // Fetch tracking details
      const { data: tracking } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      // Restaurant coordinates (Flagship Bandra: 19.0596, 72.8295)
      const restaurantLocation = {
        name: 'Folk & Flame Flagship',
        latitude: 19.0596,
        longitude: 72.8295,
        address: 'Waterfield Road, Bandra West, Mumbai'
      };

      const customerLocation = order.delivery_address ? {
        recipient: order.customer_name,
        latitude: Number(order.delivery_address.latitude || 19.0760),
        longitude: Number(order.delivery_address.longitude || 72.8777),
        address: `${order.delivery_address.street_address || ''}, ${order.delivery_address.city || ''}`
      } : null;

      // Status timeline sequence
      const statusSequence = [
        { key: 'placed', label: 'Order Placed', icon: 'FileText' },
        { key: 'accepted', label: 'Restaurant Accepted', icon: 'CheckCircle' },
        { key: 'preparing', label: 'Flame Kitchen Preparing', icon: 'Flame' },
        { key: 'ready', label: 'Order Ready & Packed', icon: 'Package' },
        { key: 'out_for_delivery', label: 'Rider Out for Delivery', icon: 'Bike' },
        { key: 'delivered', label: 'Delivered to Doorstep', icon: 'Home' }
      ];

      const currentStatusIndex = statusSequence.findIndex(s => s.key === order.status);

      res.json({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          order_type: order.order_type,
          created_at: order.created_at,
          total: order.total,
          items: order.items
        },
        restaurant: restaurantLocation,
        destination: customerLocation,
        tracking: tracking ? {
          rider_name: tracking.rider_name,
          rider_phone: tracking.rider_phone,
          current_lat: Number(tracking.current_lat),
          current_lng: Number(tracking.current_lng),
          estimated_minutes: tracking.estimated_minutes,
          last_updated: tracking.last_updated
        } : null,
        timeline: statusSequence.map((step, idx) => ({
          ...step,
          completed: currentStatusIndex >= idx,
          active: currentStatusIndex === idx
        }))
      });
    } catch (err) {
      next(err);
    }
  },

  // Live rider movement simulation endpoint
  async advanceRiderSimulation(req, res, next) {
    try {
      const { orderId } = req.params;

      const { data: tracking } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!tracking) {
        return res.status(404).json({ success: false, message: 'Tracking not found.' });
      }

      // Nudge coordinates closer to destination
      const destLat = Number(tracking.destination_lat || 19.0760);
      const destLng = Number(tracking.destination_lng || 72.8777);
      const currLat = Number(tracking.current_lat);
      const currLng = Number(tracking.current_lng);

      const nextLat = currLat + (destLat - currLat) * 0.25;
      const nextLng = currLng + (destLng - currLng) * 0.25;
      const nextEta = Math.max(2, tracking.estimated_minutes - 4);

      const { data: updated } = await supabase
        .from('delivery_tracking')
        .update({
          current_lat: nextLat,
          current_lng: nextLng,
          estimated_minutes: nextEta,
          last_updated: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .select('*')
        .single();

      res.json({
        success: true,
        tracking: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = trackingController;
