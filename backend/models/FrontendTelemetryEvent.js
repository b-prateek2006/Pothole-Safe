const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FrontendTelemetryEvent = sequelize.define('FrontendTelemetryEvent', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  eventType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'event_type',
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'error'),
    allowNull: false,
    defaultValue: 'error',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'page_url',
  },
  requestId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'request_id',
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_agent',
  },
  clientTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'client_timestamp',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'frontend_telemetry_events',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = FrontendTelemetryEvent;