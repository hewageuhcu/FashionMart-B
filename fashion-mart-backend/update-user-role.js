// Quick script to update user role
// Run this with: node update-user-role.js

const db = require('./models');
const User = db.user;

async function updateUserRole() {
  try {
    const userId = 'user_2z7oU3MvRhDNS0S6GzNCO7xDL4M';
    const newRole = 'admin'; // Change this to the desired role
    
    // Find the user
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }
    
    console.log(`Current user role: ${user.role}`);
    console.log(`Updating to: ${newRole}`);
    
    // Update the role
    user.role = newRole;
    await user.save();
    
    console.log('User role updated successfully!');
    console.log(`User ${user.email} is now a ${newRole}`);
    
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    // Close database connection
    await db.sequelize.close();
  }
}

updateUserRole();
