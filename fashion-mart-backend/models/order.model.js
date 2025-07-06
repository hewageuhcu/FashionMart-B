module.exports = (sequelize, Sequelize) => {
  const Order = sequelize.define("order", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    customerId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'),
      defaultValue: 'pending'
    },
    totalAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    shippingAddress: {
      type: Sequelize.JSON,
      allowNull: false
    },
    paymentId: {
      type: Sequelize.STRING
    },
    paymentStatus: {
      type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    staffId: {
      type: Sequelize.STRING,
      allowNull: true // Will be assigned when a staff starts processing
    },
    notes: {
      type: Sequelize.TEXT
    },
    returnDeadline: {
      type: Sequelize.DATE, 
      // Will be set to 7 days after delivery when status changes to 'delivered'
    }
  });

  return Order;
};