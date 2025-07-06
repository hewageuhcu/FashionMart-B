module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define("notification", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('low_stock', 'new_order', 'order_status', 'payment', 'return', 'system'),
      allowNull: false
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    read: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    data: {
      type: Sequelize.JSON, // Additional data related to the notification
      defaultValue: {}
    }
  });

  return Notification;
};