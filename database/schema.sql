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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX idx_status ON pothole_reports(verification_status);
CREATE INDEX idx_created ON pothole_reports(created_at DESC);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
