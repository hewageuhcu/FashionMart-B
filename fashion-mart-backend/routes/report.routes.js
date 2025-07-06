// Create the report.routes.js file
// report.routes.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifySession, isAdmin } = require('../middleware/auth.middleware');

// Apply authentication middleware
router.use(verifySession, isAdmin);

// Report routes
router.get('/', reportController.getAllReports);
router.get('/:reportId', reportController.getReportById);
router.post('/monthly', reportController.generateMonthlyReport);
router.post('/quarterly', reportController.generateQuarterlyReport);
router.delete('/:reportId', reportController.deleteReport);

module.exports = router;