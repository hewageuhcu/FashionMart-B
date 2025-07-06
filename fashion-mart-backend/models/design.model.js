module.exports = (sequelize, Sequelize) => {
  const Design = sequelize.define("design", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    designerId: {
      type: Sequelize.STRING,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    images: {
      type: Sequelize.JSON, // Array of image URLs
      defaultValue: []
    },
    status: {
      type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
      defaultValue: 'draft'
    },
    categoryId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    approvedDate: {
      type: Sequelize.DATE
    },
    rejectionReason: {
      type: Sequelize.TEXT
    }
  });

  return Design;
};