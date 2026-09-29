const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/item/:menuItemId', reviewController.getMenuItemReviews);
router.post('/', optionalAuth, reviewController.addReview);

module.exports = router;
