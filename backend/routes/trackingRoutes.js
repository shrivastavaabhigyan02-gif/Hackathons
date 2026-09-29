const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

router.get('/:orderId', trackingController.getOrderTracking);
router.post('/:orderId/simulate-move', trackingController.advanceRiderSimulation);

module.exports = router;
