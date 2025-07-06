module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("user", {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true, // Add unique constraint
      validate: {
        isEmail: true
      }
    },
    firstName: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [0, 50] // Allow empty string or up to 50 characters
      }
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        len: [0, 50] // Allow empty string or up to 50 characters
      }
    },
    role: {
      type: Sequelize.ENUM('admin', 'designer', 'customer', 'staff', 'inventory_manager'),
      defaultValue: 'customer',
      allowNull: false
    },
    phoneNumber: {
      type: Sequelize.STRING,
    },
    profileImage: {
      type: Sequelize.STRING,
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  }, {
    // Enable automatic index creation
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  return User;
};