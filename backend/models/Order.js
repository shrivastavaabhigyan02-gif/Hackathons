const supabase = require('../config/supabase');
const { calculateOrderTotals } = require('../utils/orderCalculator');
const Coupon = require('./Coupon');

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `FF-${dateStr}-${rand}`;
}

const Order = {
  async create({
    userId = null,
    orderType = 'delivery',
    customerName,
    customerEmail,
    customerPhone,
    items,
    couponCode = null,
    deliveryAddress = null,
    tableNumber = null,
    pickupTime = null,
    isScheduled = false,
    scheduledFor = null,
    specialInstructions = '',
    tip = 0
  }) {
    // 1. Fetch live prices from database to prevent price tampering
    const itemIds = items.map(i => i.id || i.menu_item_id);
    const { data: dbItems, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, price, discounted_price, is_available')
      .in('id', itemIds);

    if (itemsError || !dbItems || dbItems.length === 0) {
      throw new Error('Could not find selected menu items.');
    }

    // Check availability
    for (const dbItem of dbItems) {
      if (!dbItem.is_available) {
        throw new Error(`Item "${dbItem.name}" is currently unavailable.`);
      }
    }

    // Merge live item prices with user quantities and customizations
    const verifiedItems = items.map(userItem => {
      const match = dbItems.find(d => d.id === (userItem.id || userItem.menu_item_id));
      if (!match) throw new Error('Menu item not recognized.');
      return {
        ...match,
        quantity: userItem.quantity,
        customizations: userItem.customizations,
        special_instructions: userItem.special_instructions
      };
    });

    // 2. Fetch active coupon if provided
    let validCoupon = null;
    if (couponCode) {
      const tempTotals = calculateOrderTotals({ items: verifiedItems, orderType });
      const couponCheck = await Coupon.validateCoupon(couponCode, tempTotals.subtotal);
      if (couponCheck.valid) {
        validCoupon = couponCheck.coupon;
      }
    }

    // 3. Centralized server-side recalculation
    const calculation = calculateOrderTotals({
      items: verifiedItems,
      coupon: validCoupon,
      orderType,
      tip
    });

    const orderNumber = generateOrderNumber();

    // 4. Insert Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        user_id: userId,
        order_type: orderType,
        status: 'placed',
        payment_status: 'pending',
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        delivery_fee: calculation.deliveryFee,
        tax: calculation.tax,
        tip: calculation.tip,
        total: calculation.total,
        coupon_code: validCoupon ? validCoupon.code : null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        table_number: tableNumber,
        pickup_time: pickupTime,
        is_scheduled: isScheduled,
        scheduled_for: scheduledFor,
        special_instructions: specialInstructions
      }])
      .select('*')
      .single();

    if (orderError) throw orderError;

    // 5. Insert Order Items
    const orderItemsToInsert = calculation.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      customizations: item.customizations,
      special_instructions: item.special_instructions
    }));

    const { error: itemsInsertError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsInsertError) throw itemsInsertError;

    // 6. Record coupon usage
    if (validCoupon) {
      await Coupon.recordUsage(validCoupon.code);
    }

    // 7. Audit log status history
    await supabase.from('order_status_history').insert([{
      order_id: order.id,
      status: 'placed',
      notes: `Order created via ${orderType.toUpperCase()}`,
      changed_by: 'system'
    }]);

    // 8. If delivery order, initialize delivery tracking record
    if (orderType === 'delivery') {
      await supabase.from('delivery_tracking').insert([{
        order_id: order.id,
        rider_name: 'Vikram Singh',
        rider_phone: '+91 98765 43210',
        current_lat: 19.0596,
        current_lng: 72.8295,
        destination_lat: deliveryAddress?.latitude || 19.0760,
        destination_lng: deliveryAddress?.longitude || 72.8777,
        estimated_minutes: 25
      }]);
    }

    return this.getById(order.id);
  },

  async getById(id) {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        tracking:delivery_tracking(*),
        history:order_status_history(*)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return order;
  },

  async getByOrderNumber(orderNumber) {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        tracking:delivery_tracking(*),
        history:order_status_history(*)
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return order;
  },

  async getUserOrders(userId, limit = 20) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        tracking:delivery_tracking(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getAllOrders({ status, order_type, limit = 50, offset = 0 } = {}) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        tracking:delivery_tracking(*)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (order_type && order_type !== 'all') {
      query = query.eq('order_type', order_type);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id, newStatus, notes = '', changedBy = 'staff') {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Audit trail
    await supabase.from('order_status_history').insert([{
      order_id: id,
      status: newStatus,
      notes: notes || `Status advanced to ${newStatus}`,
      changed_by: changedBy
    }]);

    // Update tracking if out for delivery or delivered
    if (newStatus === 'out_for_delivery') {
      await supabase
        .from('delivery_tracking')
        .update({ estimated_minutes: 15, last_updated: new Date().toISOString() })
        .eq('order_id', id);
    } else if (newStatus === 'delivered' || newStatus === 'completed') {
      await supabase
        .from('delivery_tracking')
        .update({ estimated_minutes: 0, last_updated: new Date().toISOString() })
        .eq('order_id', id);
    }

    return this.getById(id);
  },

  async updatePaymentStatus(id, paymentStatus, transactionId = null) {
    const updates = { payment_status: paymentStatus, updated_at: new Date().toISOString() };
    if (paymentStatus === 'successful') {
      updates.status = 'accepted'; // auto accept once paid
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await supabase.from('order_status_history').insert([{
      order_id: id,
      status: order.status,
      notes: `Payment status changed to ${paymentStatus} (TXN: ${transactionId || 'N/A'})`,
      changed_by: 'payment_gateway'
    }]);

    return order;
  }
};

module.exports = Order;
