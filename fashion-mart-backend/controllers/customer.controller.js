const db = require('../models');
const User = db.user;
const Product = db.product;
const Order = db.order;
const OrderItem = db.orderItem;
const Return = db.return;
const Payment = db.payment;
const { Op } = require('sequelize');
const helpers = require('../utils/helpers');
const emailService = require('../services/email.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get customer profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update customer profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    
    // Process profile image if uploaded
    if (req.file) {
      user.profileImage = req.file.path;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Get customer orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.userId },
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
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get order by ID
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
            }
          ]
        },
        {
          model: db.payment,
          as: 'payment'
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if the order belongs to the customer
    if (order.customerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
      error: error.message
    });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    
    // Validate required fields
    if (!items || !items.length || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Items and shipping address are required'
      });
    }
    
    // Check if shipping address has required fields
    const requiredAddressFields = ['name', 'street', 'city', 'state', 'zip', 'country'];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({
          success: false,
          message: `Shipping address is missing ${field}`
        });
      }
    }
    
    // Validate items and calculate total
    let orderItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      // Validate item
      if (!item.productId || !item.stockId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, stockId and quantity'
        });
      }
      
      // Check if product exists
      const product = await Product.findByPk(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }
      
      // Check if stock exists and has enough quantity
      const stock = await db.stock.findByPk(item.stockId);
      if (!stock) {
        return res.status(404).json({
          success: false,
          message: `Stock with ID ${item.stockId} not found`
        });
      }
      
      if (stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for product ${product.name}`
        });
      }
      
      // Calculate subtotal
      const price = parseFloat(product.price);
      const subtotal = price * item.quantity;
      
      // Add to order items
      orderItems.push({
        productId: item.productId,
        stockId: item.stockId,
        quantity: item.quantity,
        price: price,
        subtotal: subtotal
      });
      
      // Add to total
      totalAmount += subtotal;
    }
    
    // Create order
    const order = await Order.create({
      customerId: req.userId,
      totalAmount,
      shippingAddress,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        stockId: item.stockId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      });
      
      // Update stock
      const stock = await db.stock.findByPk(item.stockId);
      stock.quantity -= item.quantity;
      await stock.save();
    }
    
    // Get customer for email notification
    const customer = await User.findByPk(req.userId);
    
    // Send order confirmation email
    const orderWithItems = await Order.findByPk(order.id, {
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
        }
      ]
    });
    
    emailService.sendOrderConfirmation(orderWithItems, customer);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        paymentIntent: null // Will be filled if Stripe is used
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Create payment intent for order
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
    
    // Check if the order belongs to the customer
    if (order.customerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
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
        customerId: req.userId
      }
    });
    
    // Create payment record
    const payment = await Payment.create({
      orderId: order.id,
      customerId: req.userId,
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
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;
    
    // Get order
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if the order belongs to the customer
    if (order.customerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Get payment
    const payment = await Payment.findOne({
      where: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntentId
      }
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check payment status with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update payment
      payment.status = 'succeeded';
      payment.stripePaymentId = paymentIntent.id;
      await payment.save();
      
      // Update order
      order.paymentStatus = 'paid';
      order.status = 'processing';
      await order.save();
      
      res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        data: {
          order,
          payment
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not succeeded',
        data: {
          paymentStatus: paymentIntent.status
        }
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
};

// Create return request
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, orderItemId, reason } = req.body;
    
    // Validate required fields
    if (!orderId || !orderItemId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, order item ID and reason are required'
      });
    }
    
    // Get order
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if the order belongs to the customer
    if (order.customerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned'
      });
    }
    
    // Check if order is within return period
    const now = new Date();
    if (!order.returnDeadline || now > order.returnDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Return period has expired'
      });
    }
    
    // Check if the order item exists and belongs to the order
    const orderItem = await OrderItem.findOne({
      where: {
        id: orderItemId,
        orderId: orderId
      }
    });
    
    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }
    
    // Check if item already has a return request
    const existingReturn = await Return.findOne({
      where: {
        orderItemId: orderItemId
      }
    });
    
    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'This item already has a return request'
      });
    }
    
    // Process images if uploaded
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }
    
    // Create return request
    const returnRequest = await Return.create({
      orderId,
      orderItemId,
      customerId: req.userId,
      reason,
      images,
      status: 'pending'
    });
    
    // Get customer for email notification
    const customer = await User.findByPk(req.userId);
    
    // Send return confirmation email
    const returnWithDetails = await Return.findByPk(returnRequest.id, {
      include: [
        {
          model: db.order,
          as: 'order'
        }
      ]
    });
    
    emailService.sendReturnConfirmation(returnWithDetails, customer);
    
    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      data: returnRequest
    });
  } catch (error) {
    console.error('Error creating return request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create return request',
      error: error.message
    });
  }
};

// Get customer's return requests
exports.getReturnRequests = async (req, res) => {
  try {
    const returns = await Return.findAll({
      where: { customerId: req.userId },
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
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error getting return requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get return requests',
      error: error.message
    });
  }
};