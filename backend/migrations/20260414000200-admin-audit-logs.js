'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id BIGINT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100) NULL,
        target_id VARCHAR(100) NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        request_id VARCHAR(64) NULL,
        ip_address VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_audit_action (action),
        INDEX idx_admin_audit_created_at (created_at),
        INDEX idx_admin_audit_admin_user_id (admin_user_id),
        CONSTRAINT fk_admin_audit_user
          FOREIGN KEY (admin_user_id)
          REFERENCES admin_users(id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  async down(queryInterface) {
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'true') {
      throw new Error('Rollback blocked. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true to allow destructive rollback.');
    }

    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admin_audit_logs;');
  },
};