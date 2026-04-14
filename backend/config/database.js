const { Sequelize } = require('sequelize');

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const dbSslEnabled = process.env.DB_SSL === 'true';
const dialectOptions = dbSslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: toInt(process.env.DB_PORT, 3306),
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: toInt(process.env.DB_POOL_MAX, 10),
      min: toInt(process.env.DB_POOL_MIN, 2),
      acquire: toInt(process.env.DB_POOL_ACQUIRE, 30000),
      idle: toInt(process.env.DB_POOL_IDLE, 10000),
    },
    retry: {
      max: toInt(process.env.DB_RETRY_MAX, 3),
    },
    dialectOptions,
  }
);

module.exports = sequelize;
