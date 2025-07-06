module.exports = (sequelize, Sequelize) => {
  const Report = sequelize.define("report", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    type: {
      type: Sequelize.ENUM('monthly', 'quarterly', 'annual', 'custom'),
      allowNull: false
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    startDate: {
      type: Sequelize.DATE,
      allowNull: false
    },
    endDate: {
      type: Sequelize.DATE,
      allowNull: false
    },
    createdBy: {
      type: Sequelize.STRING, // Admin ID
      allowNull: false
    },
    data: {
      type: Sequelize.JSON, // Report data
      allowNull: false
    },
    pdfUrl: {
      type: Sequelize.STRING, // URL to the PDF version
      allowNull: true
    }
  });

  return Report;
};