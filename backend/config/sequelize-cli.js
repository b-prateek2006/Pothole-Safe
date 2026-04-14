require('dotenv').config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return fallback;
}

const dbSslEnabled = toBool(process.env.DB_SSL, false);
const dialectOptions = dbSslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const baseConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || '127.0.0.1',
  port: toInt(process.env.DB_PORT, 3306),
  dialect: 'mysql',
  logging: toBool(process.env.DB_LOGGING, false) ? console.log : false,
  dialectOptions,
  migrationStorageTableName: 'SequelizeMeta',
};

module.exports = {
  development: {
    ...baseConfig,
    database: process.env.DB_NAME || 'potholesafe',
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME || 'potholesafe_test',
  },
  production: {
    ...baseConfig,
    database: process.env.DB_NAME,
  },
};