const path = require('path');
const { spawnSync } = require('child_process');

function getSequelizeCliBinary() {
  const executable = process.platform === 'win32' ? 'sequelize-cli.cmd' : 'sequelize-cli';
  return path.join(__dirname, '..', 'node_modules', '.bin', executable);
}

function runSequelizeCli(args) {
  const result = spawnSync(getSequelizeCliBinary(), args, {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`sequelize-cli exited with code ${result.status}`);
  }
}

module.exports = { runSequelizeCli };