const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { validateReservation } = require('../middleware/validator');

router.get('/slots', reservationController.getAvailableSlots);
router.post('/', optionalAuth, validateReservation, reservationController.createReservation);
router.get('/my-reservations', authMiddleware, reservationController.getMyReservations);

module.exports = router;
