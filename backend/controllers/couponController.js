const Coupon = require('../models/Coupon');

const couponController = {
  async validate(req, res, next) {
    try {
      const { code, subtotal } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required.',
          code: 'MISSING_CODE'
        });
      }

      const orderSubtotal = Math.max(0, parseFloat(subtotal) || 0);
      const result = await Coupon.validateCoupon(code, orderSubtotal);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message,
          code: 'INVALID_COUPON'
        });
      }

      res.json({
        success: true,
        message: result.message,
        code: result.coupon.code,
        discount: result.discount,
        description: result.coupon.description,
        discount_type: result.coupon.discount_type,
        discount_value: result.coupon.discount_value
      });
    } catch (err) {
      next(err);
    }
  },

  async getPublicCoupons(req, res, next) {
    try {
      const coupons = await Coupon.getAll();
      const active = coupons.filter(c => c.is_active).map(c => ({
        code: c.code,
        description: c.description,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        min_order_value: c.min_order_value,
        max_discount: c.max_discount
      }));

      res.json({
        success: true,
        coupons: active
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = couponController;
