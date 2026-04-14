'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS pothole_reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        image_path VARCHAR(255) NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        description TEXT,
        confidence_score DOUBLE DEFAULT 0,
        verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (verification_status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(36) NOT NULL PRIMARY KEY,
        expires DATETIME,
        data MEDIUMTEXT,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_sessions_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  },

  async down(queryInterface) {
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'true') {
      throw new Error('Rollback blocked. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true to allow destructive rollback.');
    }

    await queryInterface.sequelize.query('DROP TABLE IF EXISTS sessions;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS admin_users;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS pothole_reports;');
  },
};