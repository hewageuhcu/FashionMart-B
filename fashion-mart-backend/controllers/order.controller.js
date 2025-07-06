const db = require('../models');
const Order = db.order;
const OrderItem = db.orderItem;
const Product = db.product;
const User = db.user;
const Payment = db.payment;
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');

// Get all orders (admin & staff access)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: db.product,
              as: 'product'
            }
          ]
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: db.payment,
          as: 'payment'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error getting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get order by ID (admin & staff access)
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: db.product,
              as: 'product'
            },
            {
              model: db.stock,
              as: 'stock'
            }
          ]
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: db.payment,
          as: 'payment'
        },
        {
          model: db.return,
          as: 'returns'
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
};

// Update order status (admin & staff access)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Get order
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update status
    order.status = status;
    if (notes) order.notes = notes;
    
    // If status is delivered, set return deadline to 7 days from now
    if (status === 'delivered') {
      const returnDeadline = new Date();
      returnDeadline.setDate(returnDeadline.getDate() + 7);
      order.returnDeadline = returnDeadline;
    }
    
    await order.save();
    
    // Create notification for customer
    await db.notification.create({
      userId: order.customerId,
      type: 'order_status',
      title: 'Order Status Updated',
      message: `Your order #${order.id.substring(0, 8)} has been updated to ${status}`,
      data: {
        orderId: order.id,
        status: order.status
      }
    });
    
    // Send email notification
    if (status === 'shipped') {
      emailService.sendShippingNotification(order, order.customer);
    } else if (status === 'delivered') {
      emailService.sendDeliveryNotification(order, order.customer);
    }
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get order analytics
exports.getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Set default to current month if dates not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get all orders in the date range
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        },
        status: {
          [Op.not]: 'cancelled'
        }
      },
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ]
    });
    
    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Count orders by status
    const ordersByStatus = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    
    orders.forEach(order => {
      if (ordersByStatus[order.status] !== undefined) {
        ordersByStatus[order.status]++;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
        periodStart: start,
        periodEnd: end
      }
    });
  } catch (error) {
    logger.error('Error getting order analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order analytics',
      error: error.message
    });
  }
};

// Export orders report (CSV/PDF)
exports.exportOrdersReport = async (req, res) => {
  try {
    const { format, startDate, endDate } = req.query;
    
    // Set default to current month if dates not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get all orders in the date range
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: db.product,
              as: 'product',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Process report based on format
    if (format === 'csv') {
      // Implementation for CSV export
      // This would be implemented with a CSV generation library
      res.status(200).json({
        success: true,
        message: 'CSV report generation is currently under development'
      });
    } else {
      // Default to PDF if format is not specified or invalid
      // Implementation for PDF export
      // This would be implemented with PDFKit or similar library
      res.status(200).json({
        success: true,
        message: 'PDF report generation is currently under development'
      });
    }
  } catch (error) {
    logger.error('Error exporting orders report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders report',
      error: error.message
    });
  }
};