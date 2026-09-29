const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/categories', menuController.getCategories);
router.get('/items', menuController.getItems);
router.get('/item/slug/:slug', menuController.getItemBySlug);
router.get('/item/:id', menuController.getItemById);

module.exports = router;
