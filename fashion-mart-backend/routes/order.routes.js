// Create the order.routes.js file
// order.routes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifySession, isAdmin, isAdminOrStaff } = require('../middleware/auth.middleware');

// Apply authentication middleware
router.use(verifySession);

// Routes for admin and staff
router.get('/', isAdminOrStaff, orderController.getAllOrders);
router.get('/analytics', isAdminOrStaff, orderController.getOrderAnalytics);
router.get('/export', isAdminOrStaff, orderController.exportOrdersReport);
router.get('/:orderId', isAdminOrStaff, orderController.getOrderById);
router.put('/:orderId/status', isAdminOrStaff, orderController.updateOrderStatus);

module.exports = router;