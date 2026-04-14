'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS frontend_telemetry_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        severity ENUM('info', 'warning', 'error') NOT NULL DEFAULT 'error',
        message TEXT NULL,
        page_url VARCHAR(500) NULL,
        request_id VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        client_timestamp DATETIME NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_frontend_telemetry_event_type (event_type),
        INDEX idx_frontend_telemetry_severity (severity),
        INDEX idx_frontend_telemetry_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  async down(queryInterface) {
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'true') {
      throw new Error('Rollback blocked. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true to allow destructive rollback.');
    }

    await queryInterface.sequelize.query('DROP TABLE IF EXISTS frontend_telemetry_events;');
  },
};