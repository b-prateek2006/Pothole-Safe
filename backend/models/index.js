const sequelize = require('../config/database');
const PotholeReport = require('./PotholeReport');
const AdminUser = require('./AdminUser');
const AdminAuditLog = require('./AdminAuditLog');

AdminAuditLog.belongsTo(AdminUser, {
	foreignKey: 'adminUserId',
	targetKey: 'id',
});

PotholeReport.belongsTo(AdminUser, {
	foreignKey: 'deletedByAdminId',
	targetKey: 'id',
	as: 'deletedByAdmin',
});

module.exports = {
	sequelize,
	PotholeReport,
	AdminUser,
	AdminAuditLog,
};
