'use strict';

async function hasIndex(queryInterface, tableName, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT COUNT(1) AS count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = :tableName
        AND index_name = :indexName
    `,
    {
      replacements: { tableName, indexName },
    }
  );

  return Number(rows[0].count) > 0;
}

async function hasConstraint(queryInterface, tableName, constraintName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT COUNT(1) AS count
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = :tableName
        AND constraint_name = :constraintName
    `,
    {
      replacements: { tableName, constraintName },
    }
  );

  return Number(rows[0].count) > 0;
}

async function hasColumn(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT COUNT(1) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = :tableName
        AND column_name = :columnName
    `,
    {
      replacements: { tableName, columnName },
    }
  );

  return Number(rows[0].count) > 0;
}

module.exports = {
  async up(queryInterface) {
    if (!(await hasColumn(queryInterface, 'pothole_reports', 'deleted_by_admin_id'))) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports ADD COLUMN deleted_by_admin_id BIGINT NULL;');
    }

    if (!(await hasColumn(queryInterface, 'pothole_reports', 'delete_reason'))) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports ADD COLUMN delete_reason VARCHAR(255) NULL;');
    }

    if (!(await hasColumn(queryInterface, 'pothole_reports', 'deleted_at'))) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports ADD COLUMN deleted_at DATETIME NULL;');
    }

    if (!(await hasIndex(queryInterface, 'pothole_reports', 'idx_deleted_at'))) {
      await queryInterface.sequelize.query('CREATE INDEX idx_deleted_at ON pothole_reports (deleted_at);');
    }

    if (!(await hasConstraint(queryInterface, 'pothole_reports', 'fk_pothole_deleted_by_admin'))) {
      await queryInterface.sequelize.query(`
        ALTER TABLE pothole_reports
          ADD CONSTRAINT fk_pothole_deleted_by_admin
            FOREIGN KEY (deleted_by_admin_id)
            REFERENCES admin_users(id)
            ON DELETE SET NULL;
      `);
    }
  },

  async down(queryInterface) {
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== 'true') {
      throw new Error('Rollback blocked. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true to allow destructive rollback.');
    }

    if (await hasConstraint(queryInterface, 'pothole_reports', 'fk_pothole_deleted_by_admin')) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports DROP FOREIGN KEY fk_pothole_deleted_by_admin;');
    }

    if (await hasIndex(queryInterface, 'pothole_reports', 'idx_deleted_at')) {
      await queryInterface.sequelize.query('DROP INDEX idx_deleted_at ON pothole_reports;');
    }

    if (await hasColumn(queryInterface, 'pothole_reports', 'deleted_by_admin_id')) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports DROP COLUMN deleted_by_admin_id;');
    }

    if (await hasColumn(queryInterface, 'pothole_reports', 'delete_reason')) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports DROP COLUMN delete_reason;');
    }

    if (await hasColumn(queryInterface, 'pothole_reports', 'deleted_at')) {
      await queryInterface.sequelize.query('ALTER TABLE pothole_reports DROP COLUMN deleted_at;');
    }
  },
};