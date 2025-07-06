// services/report.service.js - completion

const db = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate monthly report data
const generateMonthlyReport = async (month, year) => {
  try {
    // Define date range for the month
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    
    // Get total products sold in the month
    const orderItems = await db.orderItem.findAll({
      include: [
        {
          model: db.order,
          as: 'order',
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate]
            },
            status: {
              [Op.not]: 'cancelled'
            }
          }
        },
        {
          model: db.product,
          as: 'product'
        }
      ]
    });
    
    // Calculate total products sold
    const totalProductsSold = orderItems.reduce((total, item) => total + item.quantity, 0);
    
    // Get new designs added in the month
    const newDesigns = await db.design.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Calculate total number of new designs
    const totalNewDesigns = newDesigns.length;
    
    // Calculate total spending (simplified model - in reality might be more complex)
    // Assuming spending is based on inventory purchases, marketing costs, etc.
    // For this example, we'll just use a placeholder calculation
    const totalSpending = 5000; // Placeholder value
    
    // Calculate total revenue
    const orders = await db.order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        status: {
          [Op.not]: 'cancelled'
        },
        paymentStatus: 'paid'
      }
    });
    
    const totalRevenue = orders.reduce((total, order) => total + parseFloat(order.totalAmount), 0);
    
    // Calculate total profit
    const totalProfit = totalRevenue - totalSpending;
    
    // Calculate top selling products
    const productSales = {};
    orderItems.forEach(item => {
      const productId = item.productId;
      if (productSales[productId]) {
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += parseFloat(item.subtotal);
      } else {
        productSales[productId] = {
          productId,
          name: item.product.name,
          quantity: item.quantity,
          revenue: parseFloat(item.subtotal)
        };
      }
    });
    
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    // Compile report data
    const reportData = {
      period: {
        month,
        year,
        startDate,
        endDate
      },
      metrics: {
        totalProductsSold,
        totalNewDesigns,
        totalSpending,
        totalRevenue,
        totalProfit
      },
      topSellingProducts,
      // Add other insights as needed
    };
    
    return { success: true, data: reportData };
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return { success: false, error: error.message };
  }
};

// Generate PDF from report data
const generateReportPDF = async (reportData, outputPath) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe the PDF output to a file
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    // Add content to the PDF
    // Header
    doc
      .fontSize(25)
      .text('FashionMart Monthly Report', { align: 'center' })
      .moveDown();
    
    // Period
    const periodText = `${moment().month(reportData.period.month - 1).format('MMMM')} ${reportData.period.year}`;
    doc
      .fontSize(14)
      .text(`Reporting Period: ${periodText}`, { align: 'center' })
      .moveDown();
    
    // Key metrics
    doc
      .fontSize(16)
      .text('Key Metrics', { underline: true })
      .moveDown();
    
    const metrics = reportData.metrics;
    doc.fontSize(12);
    doc.text(`Products Sold: ${metrics.totalProductsSold}`);
    doc.text(`New Designs Added: ${metrics.totalNewDesigns}`);
    doc.text(`Total Revenue: $${metrics.totalRevenue.toFixed(2)}`);
    doc.text(`Total Spending: $${metrics.totalSpending.toFixed(2)}`);
    doc.text(`Total Profit: $${metrics.totalProfit.toFixed(2)}`);
    doc.moveDown();
    
    // Top selling products
    doc
      .fontSize(16)
      .text('Top Selling Products', { underline: true })
      .moveDown();
    
    doc.fontSize(12);
    reportData.topSellingProducts.forEach((product, index) => {
      doc.text(`${index + 1}. ${product.name} - ${product.quantity} units - $${product.revenue.toFixed(2)}`);
    });
    doc.moveDown();
    
    // Footer
    doc
      .fontSize(10)
      .text(
        `This report was generated on ${moment().format('MMMM D, YYYY')} by FashionMart system.`,
        { align: 'center' }
      );
    
    // Finalize the PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({ success: true, filePath: outputPath });
      });
      
      stream.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateMonthlyReport,
  generateReportPDF
};
