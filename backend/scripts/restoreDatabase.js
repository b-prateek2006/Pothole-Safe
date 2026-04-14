require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function resolveBackupFilePath() {
  const input = process.argv[2];
  if (!input) {
    throw new Error('Backup file path is required. Usage: npm run db:restore -- <backup-file.sql>');
  }

  const resolved = path.resolve(process.cwd(), input);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Backup file not found: ${resolved}`);
  }

  return resolved;
}

async function restoreDatabase() {
  if (process.env.ALLOW_DB_RESTORE !== 'true') {
    throw new Error('Restore blocked. Set ALLOW_DB_RESTORE=true for this operation.');
  }

  const host = requiredEnv('DB_HOST');
  const port = process.env.DB_PORT || '3306';
  const user = requiredEnv('DB_USER');
  const password = requiredEnv('DB_PASSWORD');
  const database = requiredEnv('DB_NAME');
  const backupFilePath = resolveBackupFilePath();

  const mysql = process.env.MYSQL_BIN
    || (process.platform === 'win32' ? 'mysql.exe' : 'mysql');

  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    `--password=${password}`,
    '--default-character-set=utf8mb4',
    database,
  ];

  await new Promise((resolve, reject) => {
    const mysqlProcess = spawn(mysql, args, { stdio: ['pipe', 'inherit', 'pipe'] });
    const inputStream = fs.createReadStream(backupFilePath);
    let stderr = '';

    inputStream.pipe(mysqlProcess.stdin);

    mysqlProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    mysqlProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`mysql client not found. Set MYSQL_BIN or install MySQL client tools. ${err.message}`));
        return;
      }
      reject(err);
    });

    mysqlProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`mysql restore failed with code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });

  console.log(`Database restore completed from: ${backupFilePath}`);
}

restoreDatabase().catch((err) => {
  console.error('Database restore failed:', err.message);
  process.exit(1);
});