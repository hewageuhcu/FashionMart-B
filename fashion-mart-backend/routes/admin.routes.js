const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifySession, isAdmin } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Apply middleware to all routes
router.use(verifySession, isAdmin);

// Get admin dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Report management
router.post('/reports/monthly', adminController.generateMonthlyReport);
router.get('/reports', adminController.getAllReports);
router.get('/reports/:reportId', adminController.getReportById);

// Bill processing with AI
router.post('/bills/process', upload.single('billImage'), adminController.processBillImage);

module.exports = router;