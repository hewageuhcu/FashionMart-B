// Create the payment.routes.js file
// payment.routes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifySession, isAdmin, isAdminOrStaff } = require('../middleware/auth.middleware');

// Apply authentication middleware
router.use(verifySession);

// Routes for admin and staff
router.get('/', isAdmin, paymentController.getAllPayments);
router.get('/date-range', isAdminOrStaff, paymentController.getPaymentsByDateRange);
router.get('/:paymentId', isAdminOrStaff, paymentController.getPaymentById);
router.post('/:orderId/intent', isAdminOrStaff, paymentController.createPaymentIntent);
router.post('/:paymentId/refund', isAdminOrStaff, paymentController.processRefund);

module.exports = router;