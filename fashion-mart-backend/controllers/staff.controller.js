const db = require('../models');
const Order = db.order;
const OrderItem = db.orderItem;
const Return = db.return;
const User = db.user;
const Notification = db.notification;
const { Op } = require('sequelize');
const emailService = require('../services/email.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get pending orders
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        status: 'processing',
        staffId: null,
        paymentStatus: 'paid'
      },
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
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting pending orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending orders',
      error: error.message
    });
  }
};

// Get staff's assigned orders
exports.getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        staffId: req.userId,
        status: {
          [Op.not]: 'delivered'
        }
      },
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
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error getting assigned orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned orders',
      error: error.message
    });
  }
};

// Assign order to staff member
exports.assignOrder = async (req, res) => {
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
    
    // Check if order is in processable state
    if (order.status !== 'processing' || order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be assigned in its current state'
      });
    }
    
    // Check if order is already assigned
    if (order.staffId) {
      return res.status(400).json({
        success: false,
        message: 'Order is already assigned to a staff member'
      });
    }
    
    // Assign order to staff
    order.staffId = req.userId;
    await order.save();
    
    // Get assigned order with details
    const assignedOrder = await Order.findByPk(orderId, {
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
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Order assigned successfully',
      data: assignedOrder
    });
  } catch (error) {
    console.error('Error assigning order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign order',
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
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
    
    // Check if order is assigned to this staff member
    if (order.staffId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - this order is not assigned to you'
      });
    }
    
    // Check for invalid status transitions
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status}`
      });
    }
    
    // Update order status
    order.status = status;
    
    // If status is delivered, set return deadline to 7 days from now
    if (status === 'delivered') {
      const returnDeadline = new Date();
      returnDeadline.setDate(returnDeadline.getDate() + 7);
      order.returnDeadline = returnDeadline;
    }
    
    await order.save();
    
    // Create notification for customer
    await Notification.create({
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
    }
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get pending return requests
exports.getPendingReturns = async (req, res) => {
  try {
    const returns = await Return.findAll({
      where: {
        status: 'pending',
        staffId: null
      },
      include: [
        {
          model: db.order,
          as: 'order'
        },
        {
          model: db.orderItem,
          as: 'orderItem',
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
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error getting pending returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending returns',
      error: error.message
    });
  }
};

// Get staff's assigned returns
exports.getAssignedReturns = async (req, res) => {
  try {
    const returns = await Return.findAll({
      where: {
        staffId: req.userId,
        status: {
          [Op.not]: ['completed', 'rejected']
        }
      },
      include: [
        {
          model: db.order,
          as: 'order'
        },
        {
          model: db.orderItem,
          as: 'orderItem',
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
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error getting assigned returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned returns',
      error: error.message
    });
  }
};

// Assign return to staff member
exports.assignReturn = async (req, res) => {
  try {
    const { returnId } = req.params;
    
    // Get return
    const returnRequest = await Return.findByPk(returnId);
    
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    // Check if return is already assigned
    if (returnRequest.staffId) {
      return res.status(400).json({
        success: false,
        message: 'Return is already assigned to a staff member'
      });
    }
    
    // Assign return to staff
    returnRequest.staffId = req.userId;
    await returnRequest.save();
    
    // Get assigned return with details
    const assignedReturn = await Return.findByPk(returnId, {
      include: [
        {
          model: db.order,
          as: 'order'
        },
        {
          model: db.orderItem,
          as: 'orderItem',
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
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Return assigned successfully',
      data: assignedReturn
    });
  } catch (error) {
    console.error('Error assigning return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign return',
      error: error.message
    });
  }
};

// Process return
exports.processReturn = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { status, notes } = req.body;
    
    // Validate status
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Get return
    const returnRequest = await Return.findByPk(returnId, {
      include: [
        {
          model: db.order,
          as: 'order',
          include: [
            {
              model: db.payment,
              as: 'payment'
            }
          ]
        },
        {
          model: db.orderItem,
          as: 'orderItem',
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
        }
      ]
    });
    
    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }
    
    // Check if return is assigned to this staff member
    if (returnRequest.staffId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - this return is not assigned to you'
      });
    }
    
    // Check if return is in pending status
    if (returnRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Return has already been processed'
      });
    }
    
    // Update return status and notes
    returnRequest.status = status;
    if (notes) returnRequest.notes = notes;
    
    if (status === 'approved') {
      // Calculate refund amount
      const refundAmount = parseFloat(returnRequest.orderItem.subtotal);
      returnRequest.refundAmount = refundAmount;
      
      // Process refund with Stripe if payment exists
      if (returnRequest.order.payment && returnRequest.order.payment.stripePaymentId) {
        const refund = await stripe.refunds.create({
          payment_intent: returnRequest.order.payment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
        });
        
        returnRequest.refundId = refund.id;
      }
      
      // Update stock quantity
      const stock = returnRequest.orderItem.stock;
      stock.quantity += returnRequest.orderItem.quantity;
      await stock.save();
      
      // Update return status to completed
      returnRequest.status = 'completed';
    }
    
    await returnRequest.save();
    
    // Create notification for customer
    await Notification.create({
      userId: returnRequest.customerId,
      type: 'return_status',
      title: 'Return Status Updated',
      message: status === 'approved' 
        ? `Your return request for order #${returnRequest.order.id.substring(0, 8)} has been approved. Refund amount: $${returnRequest.refundAmount}.` 
        : `Your return request for order #${returnRequest.order.id.substring(0, 8)} has been rejected. Reason: ${notes || 'Not specified'}.`,
      data: {
        returnId: returnRequest.id,
        orderId: returnRequest.order.id,
        status: returnRequest.status,
        refundAmount: returnRequest.refundAmount
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Return ${status === 'approved' ? 'approved and processed' : 'rejected'} successfully`,
      data: returnRequest
    });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process return',
      error: error.message
    });
  }
};