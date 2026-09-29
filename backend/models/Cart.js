const supabase = require('../config/supabase');
const { calculateOrderTotals } = require('../utils/orderCalculator');
const Coupon = require('./Coupon');

const Cart = {
  async getOrCreateCart(userId = null, sessionId = null) {
    let query = supabase.from('cart').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      throw new Error('Either userId or sessionId must be provided.');
    }

    const { data: existing, error } = await query.maybeSingle();
    if (existing) return existing;

    const { data: newCart, error: createError } = await supabase
      .from('cart')
      .insert([{ user_id: userId, session_id: sessionId }])
      .select('*')
      .single();

    if (createError) throw createError;
    return newCart;
  },

  async getCartDetails(cartId, couponCode = null, orderType = 'delivery') {
    const { data: items, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        item:menu_items(id, name, slug, price, discounted_price, image_url, is_available, is_veg, spicy_level)
      `)
      .eq('cart_id', cartId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedItems = (items || []).map(ci => ({
      id: ci.id,
      menu_item_id: ci.menu_item_id,
      name: ci.item.name,
      slug: ci.item.slug,
      image_url: ci.item.image_url,
      is_veg: ci.item.is_veg,
      spicy_level: ci.item.spicy_level,
      is_available: ci.item.is_available,
      price: ci.item.price,
      discounted_price: ci.item.discounted_price,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      customizations: ci.customizations || [],
      special_instructions: ci.special_instructions || ''
    }));

    let validCoupon = null;
    if (couponCode) {
      const preliminary = calculateOrderTotals({ items: formattedItems, orderType });
      const couponCheck = await Coupon.validateCoupon(couponCode, preliminary.subtotal);
      if (couponCheck.valid) validCoupon = couponCheck.coupon;
    }

    const totals = calculateOrderTotals({
      items: formattedItems,
      coupon: validCoupon,
      orderType
    });

    return {
      cart_id: cartId,
      items: formattedItems,
      ...totals
    };
  },

  async addItem(cartId, { menuItemId, quantity = 1, customizations = [], specialInstructions = '' }) {
    // Look up item
    const { data: item, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, price, discounted_price, is_available')
      .eq('id', menuItemId)
      .single();

    if (itemError || !item) throw new Error('Menu item not found.');
    if (!item.is_available) throw new Error('Item is currently unavailable.');

    let addOnPrice = 0;
    if (Array.isArray(customizations)) {
      for (const c of customizations) {
        addOnPrice += Number(c.additional_price || 0);
      }
    }
    const unitPrice = (Number(item.discounted_price || item.price)) + addOnPrice;

    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert([{
        cart_id: cartId,
        menu_item_id: menuItemId,
        quantity: Math.max(1, parseInt(quantity, 10)),
        unit_price: unitPrice,
        customizations,
        special_instructions: specialInstructions
      }])
      .select('*')
      .single();

    if (error) throw error;
    return cartItem;
  },

  async updateItemQuantity(cartItemId, quantity) {
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      return this.removeItem(cartItemId);
    }
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: qty })
      .eq('id', cartItemId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async removeItem(cartItemId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);
    if (error) throw error;
    return true;
  },

  async clearCart(cartId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);
    if (error) throw error;
    return true;
  }
};

module.exports = Cart;
