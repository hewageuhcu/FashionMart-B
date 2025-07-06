module.exports = (sequelize, Sequelize) => {
  const OrderItem = sequelize.define("orderItem", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    productId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    stockId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    }
  });

  return OrderItem;
};