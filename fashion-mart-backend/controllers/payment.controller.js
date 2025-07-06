// Complete the missing payment.controller.js file
// payment.controller.js

const db = require('../models');
const Payment = db.payment;
const Order = db.order;
const User = db.user;
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/email.service');

// Get all payments (admin access)
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: Order,
          as: 'order'
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Error getting all payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Order,
          as: 'order'
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Error getting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment',
      error: error.message
    });
  }
};

// Create payment intent (similar to customer.controller, but for admin/staff)
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.totalAmount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order.id,
        customerId: order.customerId
      }
    });
    
    // Create payment record
    const payment = await Payment.create({
      orderId: order.id,
      customerId: order.customerId,
      amount: order.totalAmount,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      method: 'card'
    });
    
    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
      }
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Process refund (admin/staff access)
exports.processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    
    // Get payment
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Order,
          as: 'order'
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if payment is successfull
    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be refunded as it is not successful'
      });
    }
    
    // Calculate refund amount
    const refundAmount = amount ? parseFloat(amount) : parseFloat(payment.amount);
    
    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: 'requested_by_customer'
    });
    
    // Update payment status
    payment.status = 'refunded';
    await payment.save();
    
    // Update order payment status if full refund
    if (refundAmount >= parseFloat(payment.amount)) {
      const order = payment.order;
      order.paymentStatus = 'refunded';
      await order.save();
    }
    
    // Create refund record
    const refundRecord = await db.refund.create({
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: refundAmount,
      reason: reason || 'Customer request',
      stripeRefundId: refund.id,
      status: 'completed',
      processedBy: req.userId
    });
    
    // Notify customer about refund
    const customer = await User.findByPk(payment.customerId);
    if (customer) {
      // Create notification
      await db.notification.create({
        userId: customer.id,
        type: 'payment',
        title: 'Refund Processed',
        message: `A refund of $${refundAmount.toFixed(2)} for your order #${payment.orderId.substring(0, 8)} has been processed.`,
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          refundId: refundRecord.id,
          amount: refundAmount
        }
      });
      
      // Send email notification
      emailService.sendRefundConfirmation(payment, refundAmount, customer);
    }
    
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund: refundRecord,
        payment: payment
      }
    });
  } catch (error) {
    logger.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get payments by date range
exports.getPaymentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Set default to current month if dates not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get payments in the date range
    const payments = await Payment.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: Order,
          as: 'order'
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate total amount and count by status
    const totalAmount = payments
      .filter(payment => payment.status === 'succeeded')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    const countByStatus = {
      pending: 0,
      succeeded: 0,
      failed: 0,
      refunded: 0
    };
    
    payments.forEach(payment => {
      if (countByStatus[payment.status] !== undefined) {
        countByStatus[payment.status]++;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        payments,
        analytics: {
          totalAmount,
          totalCount: payments.length,
          countByStatus
        }
      }
    });
  } catch (error) {
    logger.error('Error getting payments by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
};
