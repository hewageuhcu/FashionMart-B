const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { verifySession, isStaff, isAdminOrStaff } = require('../middleware/auth.middleware');

// Apply middleware to all routes
router.use(verifySession, isAdminOrStaff);

// Order management
router.get('/orders/pending', staffController.getPendingOrders);
router.get('/orders/assigned', staffController.getAssignedOrders);
router.post('/orders/:orderId/assign', staffController.assignOrder);
router.put('/orders/:orderId/status', staffController.updateOrderStatus);

// Return management
router.get('/returns/pending', staffController.getPendingReturns);
router.get('/returns/assigned', staffController.getAssignedReturns);
router.post('/returns/:returnId/assign', staffController.assignReturn);
router.put('/returns/:returnId/process', staffController.processReturn);

module.exports = router;