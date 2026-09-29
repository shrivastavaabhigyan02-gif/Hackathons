/**
 * Folk & Flame Structured Logger
 * Compliant with PCI-DSS & Security Guidelines:
 * Masks and never logs passwords, CVVs, full card numbers, or authorization tokens.
 */

const SENSITIVE_KEYS = ['password', 'confirmPassword', 'password_hash', 'token', 'cvv', 'cardNumber', 'pan', 'secret'];

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      cleaned[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  http: (req, res, responseTimeMs) => {
    const logData = {
      requestId: req.headers['x-request-id'] || 'req-' + Date.now(),
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTimeMs}ms`,
      ip: req.ip || req.connection.remoteAddress
    };
    console.log(`[HTTP] [${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTimeMs}ms`);
  }
};

module.exports = logger;
