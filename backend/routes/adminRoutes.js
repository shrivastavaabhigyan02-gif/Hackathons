const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireStaffOrAdmin, requireAdmin } = require('../middleware/roleMiddleware');

// All admin routes require authentication and staff/admin permissions
router.use(authMiddleware, requireStaffOrAdmin);

// Analytics
router.get('/dashboard/stats', adminController.getDashboardStats);

// Orders & Kitchen Display System (KDS)
router.get('/orders', adminController.getLiveOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// Menu management (Admin only)
router.post('/menu', requireAdmin, adminController.addMenuItem);
router.put('/menu/:id', requireAdmin, adminController.updateMenuItem);
router.patch('/menu/:id/availability', adminController.toggleItemAvailability);
router.delete('/menu/:id', requireAdmin, adminController.deleteMenuItem);

// Table Reservations
router.get('/reservations', adminController.getReservations);
router.patch('/reservations/:id/status', adminController.updateReservationStatus);

// Coupons (Admin only)
router.get('/coupons', requireAdmin, adminController.getCoupons);
router.post('/coupons', requireAdmin, adminController.createCoupon);
router.patch('/coupons/:id/toggle', requireAdmin, adminController.toggleCoupon);

module.exports = router;
