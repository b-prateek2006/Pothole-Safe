const { Op } = require('sequelize');
const { PotholeReport } = require('../models');

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

async function getReportsByStatus(status) {
  return PotholeReport.findAll({
    where: { verificationStatus: status.toUpperCase() },
    order: [['created_at', 'DESC']],
  });
}

async function getAllReports() {
  return PotholeReport.findAll({
    order: [['created_at', 'DESC']],
  });
}

async function updateStatus(id, status) {
  const report = await PotholeReport.findByPk(id);
  if (!report) return null;
  report.verificationStatus = status;
  await report.save();
  return report;
}

async function getStats() {
  const total = await PotholeReport.count();
  const pending = await PotholeReport.count({ where: { verificationStatus: 'PENDING' } });
  const verified = await PotholeReport.count({ where: { verificationStatus: 'VERIFIED' } });
  const rejected = await PotholeReport.count({ where: { verificationStatus: 'REJECTED' } });
  return { total, pending, verified, rejected };
}

module.exports = {
  createReport,
  getVerifiedReports,
  getReportById,
  getReportsByStatus,
  getAllReports,
  updateStatus,
  getStats,
};
