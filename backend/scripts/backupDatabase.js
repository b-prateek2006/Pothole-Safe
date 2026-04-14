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

function resolveBackupPath() {
  const backendRoot = path.resolve(__dirname, '..');
  const input = process.argv[2];
  const configuredDir = process.env.BACKUP_DIR || '../database/backups';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `${requiredEnv('DB_NAME')}-${timestamp}.sql`;

  if (!input) {
    const dir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(backendRoot, configuredDir);
    return path.join(dir, defaultFilename);
  }

  const resolvedInput = path.resolve(process.cwd(), input);
  if (resolvedInput.toLowerCase().endsWith('.sql')) {
    return resolvedInput;
  }

  return path.join(resolvedInput, defaultFilename);
}

async function backupDatabase() {
  const host = requiredEnv('DB_HOST');
  const port = process.env.DB_PORT || '3306';
  const user = requiredEnv('DB_USER');
  const password = requiredEnv('DB_PASSWORD');
  const database = requiredEnv('DB_NAME');

  const outputPath = resolveBackupPath();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const mysqldump = process.env.MYSQLDUMP_BIN
    || (process.platform === 'win32' ? 'mysqldump.exe' : 'mysqldump');

  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    `--password=${password}`,
    '--single-transaction',
    '--skip-lock-tables',
    '--set-gtid-purged=OFF',
    '--default-character-set=utf8mb4',
    database,
  ];

  await new Promise((resolve, reject) => {
    const dumpProcess = spawn(mysqldump, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const outputStream = fs.createWriteStream(outputPath);
    let stderr = '';

    dumpProcess.stdout.pipe(outputStream);
    dumpProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    dumpProcess.on('error', (err) => {
      outputStream.destroy();
      if (err.code === 'ENOENT') {
        reject(new Error(`mysqldump not found. Set MYSQLDUMP_BIN or install MySQL client tools. ${err.message}`));
        return;
      }
      reject(err);
    });

    dumpProcess.on('close', (code) => {
      outputStream.end();
      if (code !== 0) {
        try {
          fs.unlinkSync(outputPath);
        } catch {
          // Ignore cleanup errors on failed backup.
        }
        reject(new Error(`mysqldump failed with code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });

  console.log(`Database backup created: ${outputPath}`);
}

backupDatabase().catch((err) => {
  console.error('Database backup failed:', err.message);
  process.exit(1);
});