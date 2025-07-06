module.exports = (sequelize, Sequelize) => {
  const Payment = sequelize.define("payment", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    customerId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    stripePaymentId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('pending', 'succeeded', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    method: {
      type: Sequelize.STRING, // 'card', 'bank_transfer', etc.
      allowNull: false
    },
    receipt: {
      type: Sequelize.STRING, // URL to the receipt
      allowNull: true
    }
  });

  return Payment;
};