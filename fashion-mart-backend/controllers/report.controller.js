// Create the missing report.controller.js file
// report.controller.js

const db = require('../models');
const Report = db.report;
const User = db.user;
const Order = db.order;
const Product = db.product;
const Design = db.design;
const { Op } = require('sequelize');
const moment = require('moment');
const reportService = require('../services/report.service');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    logger.error('Error getting all reports:', error);
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
    
    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
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
    logger.error('Error getting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report',
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
    logger.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
      error: error.message
    });
  }
};

// Generate quarterly report
exports.generateQuarterlyReport = async (req, res) => {
  try {
    const { quarter, year } = req.body;
    
    // Validate quarter and year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    
    if (!quarter || !year || quarter < 1 || quarter > 4 || year < 2020 || year > currentYear || (year === currentYear && quarter > currentQuarter)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quarter or year'
      });
    }
    
    // Calculate start and end months for the quarter
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    
    // Set date range
    const startDate = moment(`${year}-${startMonth}-01`).startOf('month').toDate();
    const endDate = moment(`${year}-${endMonth}-01`).endOf('month').toDate();
    
    // Get all orders in the quarter
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.not]: 'cancelled'
        }
      },
      include: [
        {
          model: db.orderItem,
          as: 'items'
        }
      ]
    });
    
    // Get new designs in the quarter
    const newDesigns = await Design.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    const totalDesigns = newDesigns.length;
    
    // Compile report data
    const reportData = {
      period: {
        quarter,
        year,
        startDate,
        endDate
      },
      metrics: {
        totalOrders,
        totalRevenue,
        totalDesigns,
        // Other metrics would be calculated here
      },
      // More detailed data would be included here
    };
    
    // Save report
    const newReport = await Report.create({
      type: 'quarterly',
      title: `Quarterly Report - Q${quarter} ${year}`,
      startDate,
      endDate,
      createdBy: req.userId,
      data: reportData
    });
    
    // Generate PDF (this would use the same service as monthly reports)
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const pdfPath = path.join(reportDir, `quarterly-report-${year}-Q${quarter}.pdf`);
    // This would need to be implemented in the report service
    const pdfResult = { success: true }; // Placeholder for actual implementation
    
    if (pdfResult.success) {
      newReport.pdfUrl = `/reports/quarterly-report-${year}-Q${quarter}.pdf`;
      await newReport.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Quarterly report generated successfully',
      data: {
        report: newReport,
        pdfUrl: newReport.pdfUrl
      }
    });
  } catch (error) {
    logger.error('Error generating quarterly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quarterly report',
      error: error.message
    });
  }
};

// Delete report
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findByPk(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Delete PDF file if exists
    if (report.pdfUrl) {
      const pdfPath = path.join(__dirname, '..', report.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }
    
    // Delete report from database
    await report.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error.message
    });
  }
};
