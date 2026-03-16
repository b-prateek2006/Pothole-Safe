const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PotholeReport = sequelize.define('PotholeReport', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  imagePath: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'image_path',
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  confidenceScore: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
    field: 'confidence_score',
  },
  verificationStatus: {
    type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
    defaultValue: 'PENDING',
    field: 'verification_status',
  },
}, {
  tableName: 'pothole_reports',
  timestamps: true,
  underscored: true,
});

module.exports = PotholeReport;
