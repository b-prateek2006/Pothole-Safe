require('dotenv').config();

const { runSequelizeCli } = require('./sequelizeCli');

if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'true') {
  console.error('Rollback blocked. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true to run npm run migrate:undo.');
  process.exit(1);
}

try {
  runSequelizeCli(['db:migrate:undo']);
  console.log('Rollback completed.');
} catch (err) {
  console.error('Rollback failed:', err.message);
  process.exit(1);
}