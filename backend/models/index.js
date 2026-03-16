const sequelize = require('../config/database');
const PotholeReport = require('./PotholeReport');
const AdminUser = require('./AdminUser');

module.exports = { sequelize, PotholeReport, AdminUser };
