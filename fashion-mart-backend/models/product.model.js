module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define("product", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    categoryId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    designerId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    images: {
      type: Sequelize.JSON, // Array of image URLs
      defaultValue: []
    },
    featured: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    trending: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return Product;
};