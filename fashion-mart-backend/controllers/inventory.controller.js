const db = require('../models');
const Product = db.product;
const Stock = db.stock;
const Design = db.design;
const Category = db.category;
const User = db.user;
const Notification = db.notification;
const { Op } = require('sequelize');
const emailService = require('../services/email.service');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: db.category,
          as: 'category'
        },
        {
          model: db.user,
          as: 'designer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: db.stock,
          as: 'stocks'
        }
      ],
      where: {
        active: true
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: db.category,
          as: 'category'
        },
        {
          model: db.user,
          as: 'designer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: db.stock,
          as: 'stocks'
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product',
      error: error.message
    });
  }
};

// Create product from approved design
exports.createProduct = async (req, res) => {
  try {
    const { designId, price, stocks } = req.body;
    
    // Validate required fields
    if (!designId || !price || !stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Design ID, price and stocks are required'
      });
    }
    
    // Get design
    const design = await Design.findByPk(designId);
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Check if design is approved
    if (design.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved designs can be used to create products'
      });
    }
    
    // Create product
    const product = await Product.create({
      name: design.name,
      description: design.description,
      price,
      categoryId: design.categoryId,
      designerId: design.designerId,
      images: design.images
    });
    
    // Create stocks
    for (const stockItem of stocks) {
      // Validate stock item
      if (!stockItem.quantity || (stockItem.size === undefined && stockItem.color === undefined)) {
        return res.status(400).json({
          success: false,
          message: 'Each stock item must have quantity and at least size or color'
        });
      }
      
      // Create stock
      await Stock.create({
        productId: product.id,
        quantity: stockItem.quantity,
        size: stockItem.size,
        color: stockItem.color,
        lowStockThreshold: stockItem.lowStockThreshold || 10
      });
    }
    
    // Get product with associations
    const newProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: db.category,
          as: 'category'
        },
        {
          model: db.user,
          as: 'designer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: db.stock,
          as: 'stocks'
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, categoryId, featured, trending, active } = req.body;
    
    // Get product
    const product = await Product.findByPk(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (categoryId) {
      // Validate category
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      product.categoryId = categoryId;
    }
    if (featured !== undefined) product.featured = featured;
    if (trending !== undefined) product.trending = trending;
    if (active !== undefined) product.active = active;
    
    // Process images if uploaded
    if (req.files && req.files.length > 0) {
      // Get current images
      const currentImages = product.images || [];
      
      // Add new images
      const newImages = req.files.map(file => file.path);
      
      product.images = [...currentImages, ...newImages];
    }
    
    // Save changes
    await product.save();
    
    // Get updated product with associations
    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: db.category,
          as: 'category'
        },
        {
          model: db.user,
          as: 'designer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: db.stock,
          as: 'stocks'
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Update stock
exports.updateStock = async (req, res) => {
  try {
    const { stockId } = req.params;
    const { quantity, lowStockThreshold } = req.body;
    
    // Get stock
    const stock = await Stock.findByPk(stockId, {
      include: [
        {
          model: db.product,
          as: 'product'
        }
      ]
    });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }
    
    // Update fields
    if (quantity !== undefined) stock.quantity = quantity;
    if (lowStockThreshold) stock.lowStockThreshold = lowStockThreshold;
    
    // Save changes
    await stock.save();
    
    // Check if stock is low after update
    if (stock.quantity <= stock.lowStockThreshold) {
      // Create notification for inventory managers
      const inventoryManagers = await User.findAll({
        where: {
          role: 'inventory_manager',
          active: true
        }
      });
      
      for (const manager of inventoryManagers) {
        // Create notification
        await Notification.create({
          userId: manager.id,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `Product ${stock.product.name} is running low on stock. Current quantity: ${stock.quantity}`,
          data: {
            productId: stock.product.id,
            stockId: stock.id,
            quantity: stock.quantity,
            threshold: stock.lowStockThreshold
          }
        });
        
        // Send email notification
        emailService.sendLowStockAlert(stock.product, stock, manager);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: stock
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get pending designs for approval
exports.getPendingDesigns = async (req, res) => {
  try {
    const designs = await Design.findAll({
      where: {
        status: 'pending'
      },
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
      ],
      order: [['createdAt', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      data: designs
    });
  } catch (error) {
    console.error('Error getting pending designs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending designs',
      error: error.message
    });
  }
};

// Approve or reject design
exports.reviewDesign = async (req, res) => {
  try {
    const { designId } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Validate status
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected'
      });
    }
    
    // If rejecting, ensure reason is provided
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    // Get design
    const design = await Design.findByPk(designId, {
      include: [
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
    
    // Check if design is pending
    if (design.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending designs can be reviewed'
      });
    }
    
    // Update design
    design.status = status;
    if (status === 'approved') {
      design.approvedDate = new Date();
    } else {
      design.rejectionReason = rejectionReason;
    }
    
    await design.save();
    
    // Create notification for designer
    await Notification.create({
      userId: design.designerId,
      type: 'design_review',
      title: `Design ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: status === 'approved' 
        ? `Your design "${design.name}" has been approved.` 
        : `Your design "${design.name}" has been rejected. Reason: ${rejectionReason}`,
      data: {
        designId: design.id,
        status: design.status,
        reason: design.rejectionReason
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Design ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: design
    });
  } catch (error) {
    console.error('Error reviewing design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review design',
      error: error.message
    });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    // Get all stocks with quantity <= threshold
    const lowStocks = await Stock.findAll({
      where: db.sequelize.literal('quantity <= lowStockThreshold'),
      include: [
        {
          model: db.product,
          as: 'product',
          include: [
            {
              model: db.category,
              as: 'category'
            }
          ]
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: lowStocks
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock products',
      error: error.message
    });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: db.category,
          as: 'subcategories'
        }
      ]
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
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Check if parent category exists
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }
    
    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      where: {
        name
      }
    });
    
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    // Process image if uploaded
    let image = null;
    if (req.file) {
      image = req.file.path;
    }
    
    // Create category
    const category = await Category.create({
      name,
      description,
      parentId: parentId || null,
      image
    });
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, parentId, active } = req.body;
    
    // Get category
    const category = await Category.findByPk(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if parent category exists
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
      
      // Check for circular reference
      if (parentId === categoryId) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent'
        });
      }
    }
    
    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (parentId !== undefined) category.parentId = parentId || null;
    if (active !== undefined) category.active = active;
    
    // Process image if uploaded
    if (req.file) {
      category.image = req.file.path;
    }
    
    // Save changes
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};