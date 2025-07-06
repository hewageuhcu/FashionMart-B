module.exports = (sequelize, Sequelize) => {
  const Return = sequelize.define("return", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    orderItemId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    customerId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    reason: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
      defaultValue: 'pending'
    },
    staffId: {
      type: Sequelize.STRING,
      allowNull: true // Staff who processes the return
    },
    refundAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true // Will be set when approved
    },
    refundId: {
      type: Sequelize.STRING,
      allowNull: true // Stripe refund ID
    },
    images: {
      type: Sequelize.JSON, // Images of the returned item
      defaultValue: []
    },
    notes: {
      type: Sequelize.TEXT
    }
  });

  return Return;
};