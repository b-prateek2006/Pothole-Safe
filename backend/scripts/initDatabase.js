require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize, AdminUser } = require('../models');
const { runSequelizeCli } = require('./sequelizeCli');

async function ensureInitialAdmin() {
  const username = process.env.INIT_ADMIN_USERNAME || 'admin';
  const password = process.env.INIT_ADMIN_PASSWORD;

  const existing = await AdminUser.findOne({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists. Skipping admin bootstrap.`);
    return;
  }

  if (!password) {
    console.log('INIT_ADMIN_PASSWORD not set. Skipping admin bootstrap.');
    return;
  }

  if (password.length < 12) {
    throw new Error('INIT_ADMIN_PASSWORD must be at least 12 characters long');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({ username, passwordHash, role: 'admin' });

  console.log(`Created initial admin user "${username}".`);
}

async function init() {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful.');

    runSequelizeCli(['db:migrate']);
    console.log('Database migrations completed.');

    await ensureInitialAdmin();

    console.log('Database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
}

init();
