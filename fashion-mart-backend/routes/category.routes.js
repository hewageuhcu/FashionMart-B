const express = require('express');
const router = express.Router();
const db = require('../models');
const Category = db.category;

// Get all categories (public endpoint)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { active: true },
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
});

// Get category by ID (public endpoint)
router.get('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId, {
      where: { active: true }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category',
      error: error.message
    });
  }
});

module.exports = router;
