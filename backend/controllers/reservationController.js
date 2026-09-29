const Reservation = require('../models/Reservation');
const notificationService = require('../services/notificationService');

const reservationController = {
  async getAvailableSlots(req, res, next) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];
      const slots = await Reservation.getAvailableSlots(targetDate);

      res.json({
        success: true,
        date: targetDate,
        slots
      });
    } catch (err) {
      next(err);
    }
  },

  async createReservation(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const {
        customer_name,
        customer_email,
        customer_phone,
        reservation_date,
        reservation_time,
        guest_count,
        seating_preference,
        special_requests
      } = req.body;

      const reservation = await Reservation.create({
        userId,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        reservationDate: reservation_date,
        reservationTime: reservation_time,
        guestCount: guest_count,
        seatingPreference: seating_preference,
        specialRequests: special_requests
      });

      await notificationService.sendReservationNotification({
        userId,
        customerName: customer_name,
        customerEmail: customer_email,
        date: reservation_date,
        time: reservation_time,
        guests: guest_count,
        status: 'confirmed'
      });

      res.status(201).json({
        success: true,
        message: 'Table reserved successfully! We look forward to welcoming you.',
        reservation
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyReservations(req, res, next) {
    try {
      const reservations = await Reservation.getUserReservations(req.user.id);
      res.json({
        success: true,
        reservations
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reservationController;
