const express = require('express');
const router = express.Router();
const { verifyClerkWebhook, verifySession } = require('../middleware/auth.middleware');
const authService = require('../services/auth.service');
const db = require('../models');
const User = db.user;

// Webhook endpoint for Clerk events
router.post('/webhook', verifyClerkWebhook, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Process webhook event
    const result = await authService.processWebhook({ type, data });
    
    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

// Get user profile
router.get('/profile', verifySession, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User profile retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

// Sync user from Clerk to local database (without session verification for initial sync)
router.post('/sync', async (req, res) => {
  try {
    const { clerkId, email, firstName, lastName, role } = req.body;
    
    // Enhanced validation
    if (!clerkId || !email) {
      return res.status(400).json({
        success: false,
        message: 'ClerkId and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Log the incoming request for debugging
    console.log('Sync request received:', {
      clerkId,
      email,
      firstName: firstName || 'null',
      lastName: lastName || 'null',
      role: role || 'null'
    });
    
    // Check if user already exists by clerkId
    let user = await User.findByPk(clerkId);
    
    if (user) {
      // Update existing user
      const updateData = {};
      if (email && email !== user.email) updateData.email = email.toLowerCase().trim();
      if (firstName !== undefined && firstName !== null && firstName !== 'null' && firstName.trim() !== '') {
        updateData.firstName = firstName.trim();
      }
      if (lastName !== undefined && lastName !== null && lastName !== 'null' && lastName.trim() !== '') {
        updateData.lastName = lastName.trim();
      }
      if (role && ['admin', 'designer', 'customer', 'staff', 'inventory_manager'].includes(role)) {
        updateData.role = role;
      }
      
      if (Object.keys(updateData).length > 0) {
        await user.update(updateData);
        console.log('User updated successfully:', user.id);
      } else {
        console.log('No updates needed for user:', user.id);
      }
    } else {
      // Check if a user with this email already exists (different clerkId)
      const existingEmailUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      
      if (existingEmailUser) {
        // User exists with different clerkId - this could happen if user recreated their Clerk account
        // Update the existing user with the new clerkId
        console.log(`Found existing user with email ${email} but different clerkId. Updating clerkId from ${existingEmailUser.id} to ${clerkId}`);
        
        const updateData = {
          firstName: (firstName && firstName !== 'null' && firstName.trim() !== '') ? firstName.trim() : existingEmailUser.firstName,
          lastName: (lastName && lastName !== 'null' && lastName.trim() !== '') ? lastName.trim() : existingEmailUser.lastName,
          role: (role && ['admin', 'designer', 'customer', 'staff', 'inventory_manager'].includes(role)) ? role : existingEmailUser.role
        };
        
        // Update the existing user instead of recreating
        await existingEmailUser.update(updateData);
        
        // Then update the primary key by destroying and recreating
        const fullUserData = {
          id: clerkId,
          email: existingEmailUser.email,
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          role: updateData.role,
          phoneNumber: existingEmailUser.phoneNumber,
          profileImage: existingEmailUser.profileImage,
          active: existingEmailUser.active
        };
        
        await existingEmailUser.destroy();
        user = await User.create(fullUserData);
        console.log('User recreated with new clerkId:', user.id);
      } else {
        // Create new user with safe defaults
        const userData = {
          id: clerkId,
          email: email.toLowerCase().trim(),
          firstName: (firstName && firstName !== 'null' && firstName.trim() !== '') ? firstName.trim() : null,
          lastName: (lastName && lastName !== 'null' && lastName.trim() !== '') ? lastName.trim() : null,
          role: (role && ['admin', 'designer', 'customer', 'staff', 'inventory_manager'].includes(role)) ? role : 'customer',
          active: true
        };
        
        console.log('Creating user with data:', userData);
        user = await User.create(userData);
        console.log('User created successfully:', user.id);
      }
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: user ? 'User synced successfully' : 'User created successfully'
    });
  } catch (error) {
    console.error('Error syncing user:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      requestBody: req.body,
      validationErrors: error.errors || null
    });
    
    // Handle specific error types
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.errors?.map(e => ({
          field: e.path,
          message: e.message,
          value: e.value
        })) || []
      });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
        details: error.errors?.map(e => ({
          field: e.path,
          message: e.message,
          value: e.value
        })) || []
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync user',
      error: error.message
    });
  }
});

// Update user role
router.patch('/user/:id/role', verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Only allow admin to change roles or users to change their own role to customer/designer
    const currentUser = await User.findByPk(req.userId);
    if (currentUser.role !== 'admin' && req.userId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.role = role;
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

module.exports = router;