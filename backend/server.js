require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🔥 FOLK AND FLAME RESTAURANT SERVER ACTIVE`);
  logger.info(`🌐 Listening on: http://localhost:${PORT}`);
  logger.info(`🍽️ API Root:      http://localhost:${PORT}/api`);
  logger.info(`⚡ Supabase:     ${process.env.SUPABASE_URL || 'Connected'}`);
  logger.info(`🛡️ Environment:  ${process.env.NODE_ENV || 'development'}`);
  logger.info(`=======================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise:', { reason: reason?.message || reason });
});
