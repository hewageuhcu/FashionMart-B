module.exports = (sequelize, Sequelize) => {
  const Stock = sequelize.define("stock", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    size: {
      type: Sequelize.STRING, // S, M, L, XL, etc.
      allowNull: true
    },
    color: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lowStockThreshold: {
      type: Sequelize.INTEGER,
      defaultValue: 10
    },
    isLowStock: {
      type: Sequelize.VIRTUAL,
      get() {
        return this.quantity <= this.lowStockThreshold;
      }
    }
  });

  return Stock;
};