const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/ask', aiLimiter, optionalAuth, aiController.ask);

module.exports = router;
