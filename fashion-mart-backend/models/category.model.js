module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define("category", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT
    },
    image: {
      type: Sequelize.STRING,
      allowNull: true
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    parentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    }
  });

  return Category;
};