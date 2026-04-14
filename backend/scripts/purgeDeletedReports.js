require('dotenv').config();

const { sequelize } = require('../models');
const potholeService = require('../services/potholeService');

function resolveRetentionDays() {
  const cliValue = Number.parseInt(process.argv[2], 10);
  if (!Number.isNaN(cliValue) && cliValue > 0) {
    return cliValue;
  }

  const envValue = Number.parseInt(process.env.REPORT_RETENTION_DAYS, 10);
  if (!Number.isNaN(envValue) && envValue > 0) {
    return envValue;
  }

  return 90;
}

async function purge() {
  const retentionDays = resolveRetentionDays();

  try {
    await sequelize.authenticate();
    const result = await potholeService.purgeSoftDeletedReports({ olderThanDays: retentionDays });

    console.log(`Purged ${result.purged} soft-deleted reports older than ${retentionDays} day(s).`);
    console.log(`Cutoff timestamp: ${result.cutoff}`);
    process.exit(0);
  } catch (err) {
    console.error('Soft-delete purge failed:', err.message);
    process.exit(1);
  }
}

purge();