-- PotholeSafe Seed Data
USE potholesafe;

-- Default admin user (password: admin123 — bcrypt hash)
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9TAyoR1g2q5bFz2sH6hY5qGqmu', 'admin');

-- Sample pothole reports
INSERT INTO pothole_reports (image_path, latitude, longitude, description, confidence_score, verification_status) VALUES
('sample1.jpg', 12.9716, 77.5946, 'Large pothole on MG Road near Brigade Road junction', 0.92, 'VERIFIED'),
('sample2.jpg', 12.9352, 77.6245, 'Deep pothole on Hosur Road causing traffic issues', 0.87, 'VERIFIED'),
('sample3.jpg', 12.9698, 77.7500, 'Pothole near Whitefield main road', 0.78, 'VERIFIED'),
('sample4.jpg', 12.9850, 77.5533, 'Road damage near Malleshwaram circle', 0.65, 'PENDING'),
('sample5.jpg', 12.9250, 77.5897, 'Crater-sized pothole on Bannerghatta Road', 0.45, 'REJECTED');
