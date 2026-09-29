/**
 * Folk & Flame Centralized Server-Side Order Calculator
 * Never trusts prices, sub-totals, discounts, or tax amounts calculated by client.
 */

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item totals, valid add-ons, coupon discount, GST/Tax, and delivery charges.
 * @param {Array} items - List of items with menu_item, quantity, and customizations
 * @param {Object} coupon - Validated coupon object (optional)
 * @param {String} orderType - 'delivery', 'pickup', or 'dine_in'
 * @param {Number} tip - User provided tip amount (validated >= 0)
 * @param {Object} settings - Restaurant settings (tax_rate, delivery_fee, free_threshold)
 */
function calculateOrderTotals({
  items,
  coupon = null,
  orderType = 'delivery',
  tip = 0,
  settings = { tax_rate: 5.0, delivery_base_fee: 49.0, free_delivery_threshold: 800.0 }
}) {
  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const basePrice = Number(item.discounted_price || item.price);
    let addOnTotal = 0;

    // Validate and sum customizations
    const verifiedCustomizations = [];
    if (Array.isArray(item.customizations)) {
      for (const custom of item.customizations) {
        const addPrice = Number(custom.additional_price || 0);
        addOnTotal += addPrice;
        verifiedCustomizations.push({
          customization_id: custom.customization_id,
          name: custom.name,
          additional_price: round2(addPrice)
        });
      }
    }

    const unitPrice = round2(basePrice + addOnTotal);
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const itemSubtotal = round2(unitPrice * quantity);

    subtotal += itemSubtotal;

    verifiedItems.push({
      menu_item_id: item.id || item.menu_item_id,
      item_name: item.name,
      base_price: round2(basePrice),
      unit_price: unitPrice,
      quantity,
      subtotal: itemSubtotal,
      customizations: verifiedCustomizations,
      special_instructions: item.special_instructions ? String(item.special_instructions).slice(0, 300) : ''
    });
  }

  subtotal = round2(subtotal);

  // Calculate Discount via Coupon
  let discount = 0;
  if (coupon && coupon.is_active) {
    const minOrder = Number(coupon.min_order_value || 0);
    if (subtotal >= minOrder) {
      if (coupon.discount_type === 'percentage') {
        const rawDiscount = (subtotal * Number(coupon.discount_value)) / 100;
        discount = coupon.max_discount ? Math.min(rawDiscount, Number(coupon.max_discount)) : rawDiscount;
      } else if (coupon.discount_type === 'fixed') {
        discount = Math.min(Number(coupon.discount_value), subtotal);
      }
    }
  }
  discount = round2(discount);

  // Delivery Fee calculation
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    const threshold = Number(settings.free_delivery_threshold || 800);
    const baseFee = Number(settings.delivery_base_fee || 49);
    deliveryFee = (subtotal - discount) >= threshold ? 0 : baseFee;
  }
  deliveryFee = round2(deliveryFee);

  // Taxes (e.g. 5% GST on F&B in India)
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxRate = Number(settings.tax_rate || 5.0);
  const tax = round2((taxableAmount * taxRate) / 100);

  // Tip
  const validTip = Math.max(0, round2(Number(tip) || 0));

  // Grand Total
  const grandTotal = round2(taxableAmount + tax + deliveryFee + validTip);

  return {
    items: verifiedItems,
    subtotal,
    discount,
    deliveryFee,
    tax,
    tip: validTip,
    total: grandTotal,
    couponApplied: coupon ? coupon.code : null
  };
}

module.exports = {
  calculateOrderTotals,
  round2
};
