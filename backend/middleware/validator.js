const validator = require('validator');

function validateRegistration(req, res, next) {
  const { full_name, email, phone, password } = req.body;
  const errors = [];

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  if (!email || !validator.isEmail(String(email).trim())) {
    errors.push('A valid email address is required.');
  }

  if (phone && !validator.isMobilePhone(String(phone).replace(/[\s-]/g, ''), 'any')) {
    errors.push('Phone number format is invalid.');
  }

  if (!password || String(password).length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
      code: 'VALIDATION_FAILED'
    });
  }

  req.body.email = validator.normalizeEmail(String(email).trim());
  req.body.full_name = validator.escape(String(full_name).trim());
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
      code: 'MISSING_CREDENTIALS'
    });
  }
  next();
}

function validateOrderCreation(req, res, next) {
  const { items, order_type, customer_name, customer_email, customer_phone } = req.body;
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Order must contain at least one item.');
  }

  if (!['delivery', 'pickup', 'dine_in'].includes(order_type)) {
    errors.push('Invalid order type. Must be delivery, pickup, or dine_in.');
  }

  if (!customer_name || String(customer_name).trim().length < 2) {
    errors.push('Customer name is required.');
  }

  if (!customer_email || !validator.isEmail(String(customer_email).trim())) {
    errors.push('Valid customer email is required.');
  }

  if (!customer_phone || String(customer_phone).trim().length < 8) {
    errors.push('Valid contact phone is required.');
  }

  if (order_type === 'delivery') {
    const addr = req.body.delivery_address;
    if (!addr || !addr.street_address || !addr.city || !addr.postal_code) {
      errors.push('Complete delivery address (street, city, postal code) is required for delivery.');
    }
  }

  if (order_type === 'dine_in') {
    if (!req.body.table_number) {
      errors.push('Table number is required for dine-in orders.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
      code: 'VALIDATION_FAILED'
    });
  }

  next();
}

function validateReservation(req, res, next) {
  const { customer_name, customer_email, customer_phone, reservation_date, reservation_time, guest_count } = req.body;
  const errors = [];

  if (!customer_name || String(customer_name).trim().length < 2) {
    errors.push('Customer name is required.');
  }

  if (!customer_email || !validator.isEmail(String(customer_email).trim())) {
    errors.push('A valid email address is required.');
  }

  if (!customer_phone || String(customer_phone).trim().length < 8) {
    errors.push('A valid phone number is required.');
  }

  if (!reservation_date || !validator.isDate(String(reservation_date))) {
    errors.push('Valid reservation date is required (YYYY-MM-DD).');
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (reservation_date < today) {
      errors.push('Reservation date cannot be in the past.');
    }
  }

  if (!reservation_time) {
    errors.push('Reservation time slot is required.');
  }

  const guests = parseInt(guest_count, 10);
  if (isNaN(guests) || guests < 1 || guests > 20) {
    errors.push('Guest count must be between 1 and 20.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
      code: 'VALIDATION_FAILED'
    });
  }

  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateOrderCreation,
  validateReservation
};
