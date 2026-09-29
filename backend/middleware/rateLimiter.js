const rateLimit = require('express-rate-limit');

// General API limiter: 300 requests per 15 mins
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in a few minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Sensitive Auth limiter (Login, Register): 20 requests per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// AI Assistant limiter: 40 requests per 5 mins
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Flame AI is experiencing high traffic. Please wait a moment before sending more queries.',
    code: 'AI_RATE_LIMIT_EXCEEDED'
  }
});

// Checkout & Payment limiter: 25 requests per 10 mins
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 35,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many checkout or payment actions. Please wait a moment.',
    code: 'CHECKOUT_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
  checkoutLimiter
};
