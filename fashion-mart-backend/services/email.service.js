// Create additional required services
// email.service.js

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send order confirmation
exports.sendOrderConfirmation = async (order, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: `FashionMart - Order Confirmation #${order.id.substring(0, 8)}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Hi ${customer.firstName},</p>
        <p>We're pleased to confirm that your order has been received and is being processed.</p>
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${order.id.substring(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${parseFloat(order.totalAmount).toFixed(2)}</p>
        <h3>Items</h3>
        <ul>
          ${order.items.map(item => `
            <li>
              ${item.product.name} x ${item.quantity} - $${parseFloat(item.subtotal).toFixed(2)}
            </li>
          `).join('')}
        </ul>
        <p>Your order will be processed soon. We'll send you another email when your order ships.</p>
        <p>Thank you for shopping with FashionMart!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Order confirmation email sent to ${customer.email} for order ${order.id}`);
  } catch (error) {
    logger.error('Error sending order confirmation email:', error);
  }
};

// Send shipping notification
exports.sendShippingNotification = async (order, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: `FashionMart - Your Order #${order.id.substring(0, 8)} Has Shipped`,
      html: `
        <h1>Your Order Has Shipped!</h1>
        <p>Hi ${customer.firstName},</p>
        <p>We're pleased to inform you that your order has been shipped and is on its way!</p>
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${order.id.substring(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${parseFloat(order.totalAmount).toFixed(2)}</p>
        <p>Thank you for shopping with FashionMart!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Shipping notification email sent to ${customer.email} for order ${order.id}`);
  } catch (error) {
    logger.error('Error sending shipping notification email:', error);
  }
};

// Send delivery notification
exports.sendDeliveryNotification = async (order, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: `FashionMart - Your Order #${order.id.substring(0, 8)} Has Been Delivered`,
      html: `
        <h1>Your Order Has Been Delivered!</h1>
        <p>Hi ${customer.firstName},</p>
        <p>We're pleased to inform you that your order has been delivered!</p>
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${order.id.substring(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${parseFloat(order.totalAmount).toFixed(2)}</p>
        <h3>Return Policy</h3>
        <p>If you're not completely satisfied with your purchase, you can return it within 7 days. Please visit our website for return instructions.</p>
        <p>Thank you for shopping with FashionMart!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Delivery notification email sent to ${customer.email} for order ${order.id}`);
  } catch (error) {
    logger.error('Error sending delivery notification email:', error);
  }
};

// Send return confirmation
exports.sendReturnConfirmation = async (returnRequest, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: `FashionMart - Return Request Confirmation #${returnRequest.id.substring(0, 8)}`,
      html: `
        <h1>Return Request Received</h1>
        <p>Hi ${customer.firstName},</p>
        <p>We have received your return request. Our team will review it shortly.</p>
        <h2>Return Details</h2>
        <p><strong>Return ID:</strong> ${returnRequest.id.substring(0, 8)}</p>
        <p><strong>Order ID:</strong> ${returnRequest.order.id.substring(0, 8)}</p>
        <p><strong>Date:</strong> ${new Date(returnRequest.createdAt).toLocaleDateString()}</p>
        <p><strong>Reason:</strong> ${returnRequest.reason}</p>
        <p>We'll notify you once your return request has been processed.</p>
        <p>Thank you for your patience and for shopping with FashionMart!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Return confirmation email sent to ${customer.email} for return ${returnRequest.id}`);
  } catch (error) {
    logger.error('Error sending return confirmation email:', error);
  }
};

// Send refund confirmation
exports.sendRefundConfirmation = async (payment, refundAmount, customer) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customer.email,
      subject: `FashionMart - Refund Processed for Order #${payment.orderId.substring(0, 8)}`,
      html: `
        <h1>Refund Processed</h1>
        <p>Hi ${customer.firstName},</p>
        <p>We've processed a refund for your order.</p>
        <h2>Refund Details</h2>
        <p><strong>Order ID:</strong> ${payment.orderId.substring(0, 8)}</p>
        <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>The refund should appear in your account within 5-7 business days, depending on your payment method and financial institution.</p>
        <p>Thank you for shopping with FashionMart!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Refund confirmation email sent to ${customer.email} for order ${payment.orderId}`);
  } catch (error) {
    logger.error('Error sending refund confirmation email:', error);
  }
};

// Send low stock alert
exports.sendLowStockAlert = async (product, stock, manager) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: manager.email,
      subject: `FashionMart - Low Stock Alert: ${product.name}`,
      html: `
        <h1>Low Stock Alert</h1>
        <p>Hi ${manager.firstName},</p>
        <p>This is an automated notification to inform you that the following product is running low on stock:</p>
        <h2>Product Details</h2>
        <p><strong>Product Name:</strong> ${product.name}</p>
        <p><strong>Product ID:</strong> ${product.id.substring(0, 8)}</p>
        <p><strong>Current Quantity:</strong> ${stock.quantity}</p>
        <p><strong>Threshold:</strong> ${stock.lowStockThreshold}</p>
        ${stock.size ? `<p><strong>Size:</strong> ${stock.size}</p>` : ''}
        ${stock.color ? `<p><strong>Color:</strong> ${stock.color}</p>` : ''}
        <p>Please review and consider restocking this item to prevent potential stockouts.</p>
        <p>Thank you.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Low stock alert email sent to ${manager.email} for product ${product.id}`);
  } catch (error) {
    logger.error('Error sending low stock alert email:', error);
  }
};