const supabase = require('../config/supabase');

const Review = {
  async getByMenuItem(menuItemId, limit = 20) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async create({ userId = null, orderId = null, menuItemId = null, foodRating, serviceRating = null, deliveryRating = null, comment = '', customerName = 'Guest' }) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        user_id: userId,
        order_id: orderId,
        menu_item_id: menuItemId,
        food_rating: parseInt(foodRating, 10),
        service_rating: serviceRating ? parseInt(serviceRating, 10) : null,
        delivery_rating: deliveryRating ? parseInt(deliveryRating, 10) : null,
        comment,
        customer_name: customerName,
        is_moderated: true // default approved for demo, can be toggled by admin
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Recalculate menu item rating if menuItemId is present
    if (menuItemId) {
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('food_rating')
        .eq('menu_item_id', menuItemId)
        .eq('is_moderated', true);

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum, r) => sum + r.food_rating, 0) / allReviews.length;
        await supabase
          .from('menu_items')
          .update({
            rating: Math.round(avg * 10) / 10,
            review_count: allReviews.length
          })
          .eq('id', menuItemId);
      }
    }

    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        item:menu_items(name, image_url)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

module.exports = Review;
