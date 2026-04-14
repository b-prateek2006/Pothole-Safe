const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminAuditLog = sequelize.define('AdminAuditLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  adminUserId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'admin_user_id',
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  targetType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'target_type',
  },
  targetId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'target_id',
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  requestId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'request_id',
  },
  ipAddress: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_agent',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'admin_audit_logs',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = AdminAuditLog;