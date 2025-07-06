const db = require('../models');
const Design = db.design;
const Category = db.category;
const fs = require('fs');
const path = require('path');

// Create a new design
exports.createDesign = async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;
    
    // Validate required fields
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }
    
    // Check if category exists
    const category = await Category.findByPk(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Process images if uploaded
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }
    
    // Create design
    const design = await Design.create({
      name,
      description,
      categoryId,
      designerId: req.userId,
      images,
      status: 'pending'
    });
    
    res.status(201).json({
      success: true,
      message: 'Design created successfully',
      data: design
    });
  } catch (error) {
    console.error('Error creating design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create design',
      error: error.message
    });
  }
};

// Get all designs by designer
exports.getDesignerDesigns = async (req, res) => {
  try {
    const designs = await Design.findAll({
      where: { designerId: req.userId },
      include: [
        {
          model: db.category,
          as: 'category'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: designs
    });
  } catch (error) {
    console.error('Error getting designs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get designs',
      error: error.message
    });
  }
};

// Get design by ID
exports.getDesignById = async (req, res) => {
  try {
    const { designId } = req.params;
    
    const design = await Design.findByPk(designId, {
      include: [
        {
          model: db.category,
          as: 'category'
        },
        {
          model: db.user,
          as: 'designer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Check if the design belongs to the designer or is an admin
    if (design.designerId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    res.status(200).json({
      success: true,
      data: design
    });
  } catch (error) {
    console.error('Error getting design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get design',
      error: error.message
    });
  }
};

// Update design
exports.updateDesign = async (req, res) => {
  try {
    const { designId } = req.params;
    const { name, description, categoryId } = req.body;
    
    // Get design
    const design = await Design.findByPk(designId);
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Check if the design belongs to the designer
    if (design.designerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Check if design is in a state that can be updated
    if (design.status !== 'draft' && design.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Design cannot be updated in its current state'
      });
    }
    
    // Update fields
    if (name) design.name = name;
    if (description) design.description = description;
    if (categoryId) {
      // Validate category
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      design.categoryId = categoryId;
    }
    
    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      // Get current images
      const currentImages = design.images || [];
      
      // Add new images
      const newImages = req.files.map(file => file.path);
      
      design.images = [...currentImages, ...newImages];
    }
    
    // Reset status to pending if it was rejected
    if (design.status === 'rejected') {
      design.status = 'pending';
    }
    
    // Save changes
    await design.save();
    
    res.status(200).json({
      success: true,
      message: 'Design updated successfully',
      data: design
    });
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update design',
      error: error.message
    });
  }
};

// Delete design
exports.deleteDesign = async (req, res) => {
  try {
    const { designId } = req.params;
    
    // Get design
    const design = await Design.findByPk(designId);
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Check if the design belongs to the designer
    if (design.designerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Check if design is in a state that can be deleted
    if (design.status !== 'draft' && design.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Design cannot be deleted in its current state'
      });
    }
    
    // Delete image files
    if (design.images && design.images.length > 0) {
      design.images.forEach(imagePath => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }
    
    // Delete design
    await design.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete design',
      error: error.message
    });
  }
};

// Submit design for approval
exports.submitDesign = async (req, res) => {
  try {
    const { designId } = req.params;
    
    // Get design
    const design = await Design.findByPk(designId);
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Check if the design belongs to the designer
    if (design.designerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Check if design is in draft state
    if (design.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only designs in draft state can be submitted'
      });
    }
    
    // Update status
    design.status = 'pending';
    await design.save();
    
    res.status(200).json({
      success: true,
      message: 'Design submitted for approval',
      data: design
    });
  } catch (error) {
    console.error('Error submitting design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit design',
      error: error.message
    });
  }
};