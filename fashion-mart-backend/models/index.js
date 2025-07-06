const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.user = require("./user.model.js")(sequelize, Sequelize);
db.product = require("./product.model.js")(sequelize, Sequelize);
db.stock = require("./stock.model.js")(sequelize, Sequelize);
db.design = require("./design.model.js")(sequelize, Sequelize);
db.order = require("./order.model.js")(sequelize, Sequelize);
db.orderItem = require("./order-item.model.js")(sequelize, Sequelize);
db.return = require("./return.model.js")(sequelize, Sequelize);
db.payment = require("./payment.model.js")(sequelize, Sequelize);
db.category = require("./category.model.js")(sequelize, Sequelize);
db.notification = require("./notification.model.js")(sequelize, Sequelize);
db.report = require("./report.model.js")(sequelize, Sequelize);

// Relationships - Optimized to reduce key count

// Core relationships with constraints (most important)
db.product.belongsTo(db.user, { foreignKey: 'designerId', as: 'designer' });
db.product.belongsTo(db.category, { foreignKey: 'categoryId', as: 'category' });
db.stock.belongsTo(db.product, { foreignKey: 'productId', as: 'product' });
db.orderItem.belongsTo(db.order, { foreignKey: 'orderId', as: 'order' });
db.orderItem.belongsTo(db.product, { foreignKey: 'productId', as: 'product' });
db.orderItem.belongsTo(db.stock, { foreignKey: 'stockId', as: 'stock' });
db.order.belongsTo(db.user, { foreignKey: 'customerId', as: 'customer' });
db.payment.belongsTo(db.order, { foreignKey: 'orderId', as: 'payment' });

// Reverse relationships without constraints to reduce key count
db.user.hasMany(db.design, { foreignKey: 'designerId', as: 'designs', constraints: false });
db.user.hasMany(db.order, { foreignKey: 'customerId', as: 'orders', constraints: false });
db.user.hasMany(db.order, { foreignKey: 'staffId', as: 'processedOrders', constraints: false });
db.user.hasMany(db.return, { foreignKey: 'staffId', as: 'processedReturns', constraints: false });
db.user.hasMany(db.notification, { foreignKey: 'userId', as: 'notifications', constraints: false });

db.product.hasMany(db.stock, { foreignKey: 'productId', as: 'stocks', constraints: false });
db.product.belongsToMany(db.order, { through: db.orderItem, foreignKey: 'productId', otherKey: 'orderId', constraints: false });

db.stock.hasMany(db.orderItem, { foreignKey: 'stockId', as: 'orderItems', constraints: false });

db.design.belongsTo(db.user, { foreignKey: 'designerId', as: 'designer', constraints: false });
db.design.belongsTo(db.category, { foreignKey: 'categoryId', as: 'category', constraints: false });

db.order.belongsTo(db.user, { foreignKey: 'staffId', as: 'staff', constraints: false });
db.order.hasMany(db.orderItem, { foreignKey: 'orderId', as: 'items', constraints: false });
db.order.hasOne(db.payment, { foreignKey: 'orderId', as: 'payment', constraints: false });
db.order.hasMany(db.return, { foreignKey: 'orderId', as: 'returns', constraints: false });

db.orderItem.hasOne(db.return, { foreignKey: 'orderItemId', as: 'return', constraints: false });

db.return.belongsTo(db.order, { foreignKey: 'orderId', as: 'order', constraints: false });
db.return.belongsTo(db.orderItem, { foreignKey: 'orderItemId', as: 'orderItem', constraints: false });
db.return.belongsTo(db.user, { foreignKey: 'customerId', as: 'customer', constraints: false });
db.return.belongsTo(db.user, { foreignKey: 'staffId', as: 'staff', constraints: false });

db.payment.belongsTo(db.user, { foreignKey: 'customerId', as: 'customer', constraints: false });

db.category.hasMany(db.product, { foreignKey: 'categoryId', as: 'products', constraints: false });
db.category.hasMany(db.design, { foreignKey: 'categoryId', as: 'designs', constraints: false });
db.category.hasMany(db.category, { foreignKey: 'parentId', as: 'subcategories', constraints: false });
db.category.belongsTo(db.category, { foreignKey: 'parentId', as: 'parent', constraints: false });

db.report.belongsTo(db.user, { foreignKey: 'createdBy', as: 'creator', constraints: false });

module.exports = db;