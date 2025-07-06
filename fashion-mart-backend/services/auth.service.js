// Create the auth.service.js file
// auth.service.js

const { Webhook } = require('svix');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;
const authConfig = require('../config/auth.config');
const { logger } = require('../utils/logger');

// Process webhook events from Clerk
exports.processWebhook = async ({ type, data }) => {
  try {
    // Handle user creation
    if (type === 'user.created') {
      await handleUserCreated(data);
    }
    
    // Handle user updated
    else if (type === 'user.updated') {
      await handleUserUpdated(data);
    }
    
    // Handle user deleted
    else if (type === 'user.deleted') {
      await handleUserDeleted(data);
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error processing webhook:', error);
    return { success: false, error: error.message };
  }
};

// Handle user creation
const handleUserCreated = async (data) => {
  try {
    // Extract user data
    const { id, email_addresses, first_name, last_name } = data;
    
    // Get primary email
    const primaryEmail = email_addresses.find(email => email.primary)?.email_address;
    
    if (!primaryEmail) {
      throw new Error('No primary email found for user');
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: primaryEmail } });
    
    if (existingUser) {
      // User already exists, update ID
      existingUser.id = id;
      await existingUser.save();
      logger.info(`Updated existing user with Clerk ID: ${id}`);
    } else {
      // Create new user
      await User.create({
        id,
        email: primaryEmail,
        firstName: first_name || '',
        lastName: last_name || '',
        role: 'customer' // Default role
      });
      logger.info(`Created new user with Clerk ID: ${id}`);
    }
  } catch (error) {
    logger.error('Error handling user creation:', error);
    throw error;
  }
};

// Handle user updated
const handleUserUpdated = async (data) => {
  try {
    // Extract user data
    const { id, email_addresses, first_name, last_name } = data;
    
    // Get primary email
    const primaryEmail = email_addresses.find(email => email.primary)?.email_address;
    
    if (!primaryEmail) {
      throw new Error('No primary email found for user');
    }
    
    // Find user
    const user = await User.findByPk(id);
    
    if (!user) {
      // User not found, create new one
      await User.create({
        id,
        email: primaryEmail,
        firstName: first_name || '',
        lastName: last_name || '',
        role: 'customer' // Default role
      });
      logger.info(`Created new user on update with Clerk ID: ${id}`);
    } else {
      // Update user data
      user.email = primaryEmail;
      user.firstName = first_name || user.firstName;
      user.lastName = last_name || user.lastName;
      await user.save();
      logger.info(`Updated user with Clerk ID: ${id}`);
    }
  } catch (error) {
    logger.error('Error handling user update:', error);
    throw error;
  }
};

// Handle user deleted
const handleUserDeleted = async (data) => {
  try {
    // Extract user ID
    const { id } = data;
    
    // Find user
    const user = await User.findByPk(id);
    
    if (user) {
      // Instead of deleting, set as inactive
      user.active = false;
      await user.save();
      logger.info(`Deactivated user with Clerk ID: ${id}`);
    } else {
      logger.warn(`User with Clerk ID ${id} not found for deletion`);
    }
  } catch (error) {
    logger.error('Error handling user deletion:', error);
    throw error;
  }
};

// Generate JWT token (backup/internal use)
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiration
  });
};