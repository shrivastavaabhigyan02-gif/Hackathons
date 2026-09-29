const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validator');

router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/profile', authMiddleware, authController.updateProfile);

// Address management
router.get('/addresses', authMiddleware, authController.getAddresses);
router.post('/addresses', authMiddleware, authController.addAddress);
router.delete('/addresses/:id', authMiddleware, authController.deleteAddress);

module.exports = router;
