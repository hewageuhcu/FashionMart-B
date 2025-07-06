// Create the routes/index.js file
// routes/index.js

const express = require('express');
const router = express.Router();

// Import route modules
const adminRoutes = require('./admin.routes');
const customerRoutes = require('./customer.routes');
const designerRoutes = require('./designer.routes');
const inventoryRoutes = require('./inventory.routes');
const staffRoutes = require('./staff.routes');
const authRoutes = require('./auth.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const reportRoutes = require('./report.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');

// Set up API routes
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);
router.use('/designer', designerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/staff', staffRoutes);
router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
