const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.post('/validate', couponController.validate);
router.get('/public', couponController.getPublicCoupons);

module.exports = router;
