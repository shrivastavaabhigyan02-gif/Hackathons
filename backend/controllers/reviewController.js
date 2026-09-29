const Review = require('../models/Review');

const reviewController = {
  async getMenuItemReviews(req, res, next) {
    try {
      const { menuItemId } = req.params;
      const reviews = await Review.getByMenuItem(menuItemId);
      res.json({
        success: true,
        reviews
      });
    } catch (err) {
      next(err);
    }
  },

  async addReview(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;
      const customerName = req.user ? req.user.full_name : (req.body.customer_name || 'Guest');
      const { order_id, menu_item_id, food_rating, service_rating, delivery_rating, comment } = req.body;

      if (!food_rating || food_rating < 1 || food_rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Food rating must be between 1 and 5.',
          code: 'INVALID_RATING'
        });
      }

      const review = await Review.create({
        userId,
        orderId: order_id,
        menuItemId: menu_item_id,
        foodRating: food_rating,
        serviceRating: service_rating,
        deliveryRating: delivery_rating,
        comment,
        customerName
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for your review!',
        review
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reviewController;
