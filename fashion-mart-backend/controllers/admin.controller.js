const db = require('../models');
const User = db.user;
const Report = db.report;
const Order = db.order;
const Product = db.product;
const Design = db.design;
const { Op } = require('sequelize');
const moment = require('moment');
const reportService = require('../services/report.service');
const imageAnalysisService = require('../services/image-analysis.service');
const fs = require('fs');
const path = require('path');

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date
    const now = new Date();
    
    // Calculate date for 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calculate date for start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get total number of users
    const totalUsers = await User.count();
    
    // Get new users in last 30 days
    const newUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    // Get total orders
    const totalOrders = await Order.count();
    
    // Get total revenue
    const orders = await Order.findAll({
      where: {
        paymentStatus: 'paid'
      }
    });
    
    const totalRevenue = orders.reduce((total, order) => {
      return total + parseFloat(order.totalAmount);
    }, 0);
    
    // Get monthly revenue
    const monthlyOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        },
        paymentStatus: 'paid'
      }
    });
    
    const monthlyRevenue = monthlyOrders.reduce((total, order) => {
      return total + parseFloat(order.totalAmount);
    }, 0);
    
    // Get total products
    const totalProducts = await Product.count();
    
    // Get total designs
    const totalDesigns = await Design.count();
    
    // Get new designs in last 30 days
    const newDesigns = await Design.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    // Return stats
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers
        },
        orders: {
          total: totalOrders
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue
        },
        products: {
          total: totalProducts
        },
        designs: {
          total: totalDesigns,
          new: newDesigns
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'designer', 'customer', 'staff', 'inventory_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Get user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update role
    user.role = role;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

// Generate monthly report
exports.generateMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    // Validate month and year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (!month || !year || month < 1 || month > 12 || year < 2020 || year > currentYear || (year === currentYear && month > currentMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year'
      });
    }
    
    // Generate report
    const result = await reportService.generateMonthlyReport(month, year);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate report',
        error: result.error
      });
    }
    
    // Save report
    const newReport = await Report.create({
      type: 'monthly',
      title: `Monthly Report - ${moment().month(month - 1).format('MMMM')} ${year}`,
      startDate: moment(`${year}-${month}-01`).startOf('month').toDate(),
      endDate: moment(`${year}-${month}-01`).endOf('month').toDate(),
      createdBy: req.userId,
      data: result.data
    });
    
    // Generate PDF
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const pdfPath = path.join(reportDir, `monthly-report-${year}-${month}.pdf`);
    const pdfResult = await reportService.generateReportPDF(result.data, pdfPath);
    
    if (pdfResult.success) {
      newReport.pdfUrl = `/reports/monthly-report-${year}-${month}.pdf`;
      await newReport.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        report: newReport,
        pdfUrl: newReport.pdfUrl
      }
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
      error: error.message
    });
  }
};

// Process bill image
exports.processBillImage = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get file path
    const filePath = req.file.path;
    
    // Process image
    const result = await imageAnalysisService.extractTextFromBill(filePath);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process bill image',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Bill processed successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error processing bill image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bill image',
      error: error.message
    });
  }
};

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error getting all reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error.message
    });
  }
};

// Get report by ID
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report',
      error: error.message
    });
  }
};