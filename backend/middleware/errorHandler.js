const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled Server Error:', {
    message: err.message,
    code: err.code,
    path: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);

  res.status(statusCode).json({
    success: false,
    message: err.userMessage || err.message || 'An unexpected error occurred. Our team has been notified.',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API route '${req.method} ${req.originalUrl}' not found.`,
    code: 'ROUTE_NOT_FOUND'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
