const supabase = require('../config/supabase');

const Coupon = {
  async findByCode(code) {
    if (!code) return null;
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async validateCoupon(code, subtotal) {
    const coupon = await this.findByCode(code);
    if (!coupon) {
      return { valid: false, message: 'Invalid or expired coupon code.' };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return { valid: false, message: 'This coupon has expired.' };
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return { valid: false, message: 'This coupon has reached its maximum redemption limit.' };
    }

    const minOrder = Number(coupon.min_order_value || 0);
    if (subtotal < minOrder) {
      return {
        valid: false,
        message: `Coupon requires a minimum order value of ₹${minOrder}. Add ₹${minOrder - subtotal} more.`
      };
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      const raw = (subtotal * Number(coupon.discount_value)) / 100;
      discount = coupon.max_discount ? Math.min(raw, Number(coupon.max_discount)) : raw;
    } else if (coupon.discount_type === 'fixed') {
      discount = Math.min(Number(coupon.discount_value), subtotal);
    }

    return {
      valid: true,
      coupon,
      discount: Math.round(discount * 100) / 100,
      message: `Coupon '${coupon.code}' applied successfully!`
    };
  },

  async recordUsage(code) {
    const coupon = await this.findByCode(code);
    if (!coupon) return;
    await supabase
      .from('coupons')
      .update({ times_used: (coupon.times_used || 0) + 1 })
      .eq('id', coupon.id);
  },

  async getAll() {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(couponData) {
    const { data, error } = await supabase
      .from('coupons')
      .insert([couponData])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

module.exports = Coupon;
