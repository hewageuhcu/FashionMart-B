const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { verifySession, isCustomer } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Apply middleware to all routes
router.use(verifySession, isCustomer);

// Profile management
router.get('/profile', customerController.getProfile);
router.put('/profile', upload.single('profileImage'), customerController.updateProfile);

// Order management
router.get('/orders', customerController.getOrders);
router.get('/orders/:orderId', customerController.getOrderById);
router.post('/orders', customerController.createOrder);
router.post('/orders/:orderId/payment', customerController.createPaymentIntent);
router.post('/orders/:orderId/payment/confirm', customerController.confirmPayment);

// Return management
router.post('/returns', upload.array('returnImages', 5), customerController.createReturnRequest);
router.get('/returns', customerController.getReturnRequests);

module.exports = router;