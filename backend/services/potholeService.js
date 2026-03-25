const { Op, fn, col, literal } = require('sequelize');
const { PotholeReport, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

async function createReport({ imagePath, latitude, longitude, description, confidenceScore }) {
  return PotholeReport.create({
    imagePath,
    latitude,
    longitude,
    description: description || null,
    confidenceScore: confidenceScore || 0,
    verificationStatus: 'PENDING',
  });
}

async function getVerifiedReports() {
  return PotholeReport.findAll({
    where: { verificationStatus: 'VERIFIED' },
    order: [['created_at', 'DESC']],
  });
}

async function getReportById(id) {
  return PotholeReport.findByPk(id);
}

async function getReportsByStatus(status, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await PotholeReport.findAndCountAll({
    where: { verificationStatus: status.toUpperCase() },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return {
    reports: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

async function getAllReports({ page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await PotholeReport.findAndCountAll({
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return {
    reports: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

async function updateStatus(id, status) {
  const report = await PotholeReport.findByPk(id);
  if (!report) return null;
  report.verificationStatus = status;
  await report.save();
  return report;
}

async function deleteReport(id) {
  const report = await PotholeReport.findByPk(id);
  if (!report) return null;

  // Delete associated image file
  if (report.imagePath) {
    const imagePath = path.join(__dirname, '..', 'uploads', report.imagePath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await report.destroy();
  return report;
}

async function getStats() {
  // Single optimized query instead of 4 separate queries
  const results = await PotholeReport.findAll({
    attributes: [
      'verificationStatus',
      [fn('COUNT', col('id')), 'count']
    ],
    group: ['verificationStatus'],
    raw: true,
  });

  const stats = { total: 0, pending: 0, verified: 0, rejected: 0 };
  results.forEach(row => {
    const count = parseInt(row.count, 10);
    stats.total += count;
    if (row.verificationStatus === 'PENDING') stats.pending = count;
    else if (row.verificationStatus === 'VERIFIED') stats.verified = count;
    else if (row.verificationStatus === 'REJECTED') stats.rejected = count;
  });

  return stats;
}

module.exports = {
  createReport,
  getVerifiedReports,
  getReportById,
  getReportsByStatus,
  getAllReports,
  updateStatus,
  deleteReport,
  getStats,
};
