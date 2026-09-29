const Menu = require('../models/Menu');

const menuController = {
  async getCategories(req, res, next) {
    try {
      const categories = await Menu.getCategories();
      res.json({
        success: true,
        categories
      });
    } catch (err) {
      next(err);
    }
  },

  async getItems(req, res, next) {
    try {
      const {
        category,
        search,
        is_veg,
        is_vegan,
        is_gluten_free,
        spice_level,
        min_price,
        max_price,
        is_bestseller,
        is_chef_special,
        sort,
        limit,
        offset
      } = req.query;

      const items = await Menu.getItems({
        category_slug: category,
        search,
        is_veg,
        is_vegan,
        is_gluten_free,
        spice_level,
        min_price,
        max_price,
        is_bestseller,
        is_chef_special,
        sort_by: sort,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      });

      res.json({
        success: true,
        count: items.length,
        items
      });
    } catch (err) {
      next(err);
    }
  },

  async getItemBySlug(req, res, next) {
    try {
      const item = await Menu.getItemBySlug(req.params.slug);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found.',
          code: 'ITEM_NOT_FOUND'
        });
      }
      res.json({
        success: true,
        item
      });
    } catch (err) {
      next(err);
    }
  },

  async getItemById(req, res, next) {
    try {
      const item = await Menu.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found.',
          code: 'ITEM_NOT_FOUND'
        });
      }
      res.json({
        success: true,
        item
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = menuController;
