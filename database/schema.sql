-- PotholeSafe Database Schema
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS potholesafe;
USE potholesafe;

-- Pothole reports table
CREATE TABLE IF NOT EXISTS pothole_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    image_path VARCHAR(255) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    description TEXT,
    confidence_score DOUBLE DEFAULT 0,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    deleted_by_admin_id BIGINT NULL,
    delete_reason VARCHAR(255) NULL,
    deleted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_status ON pothole_reports(verification_status);
CREATE INDEX idx_created ON pothole_reports(created_at DESC);
CREATE INDEX idx_deleted_at ON pothole_reports(deleted_at);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pothole_reports
    ADD CONSTRAINT fk_pothole_deleted_by_admin
    FOREIGN KEY (deleted_by_admin_id)
    REFERENCES admin_users(id)
    ON DELETE SET NULL;

-- Session store table (connect-session-sequelize)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(36) PRIMARY KEY,
    expires DATETIME,
    data MEDIUMTEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    INDEX idx_sessions_expires (expires)
);

-- Admin audit logs
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
);

-- Frontend telemetry events
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
);
