const { Op, fn, col } = require('sequelize');
const { PotholeReport } = require('../models');
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

async function getReportById(id, { includeDeleted = false } = {}) {
  return PotholeReport.findByPk(id, {
    paranoid: !includeDeleted,
  });
}

async function getReportsByStatus(status, { page = 1, limit = 10, includeDeleted = false } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await PotholeReport.findAndCountAll({
    where: { verificationStatus: status.toUpperCase() },
    order: [['created_at', 'DESC']],
    limit,
    offset,
    paranoid: !includeDeleted,
  });
  return {
    reports: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

async function getAllReports({ page = 1, limit = 10, includeDeleted = false } = {}) {
  const offset = (page - 1) * limit;
  const { count, rows } = await PotholeReport.findAndCountAll({
    order: [['created_at', 'DESC']],
    limit,
    offset,
    paranoid: !includeDeleted,
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

async function deleteReport(id, { adminId = null, reason = null } = {}) {
  const report = await PotholeReport.findByPk(id);
  if (!report) return null;

  report.deletedByAdminId = adminId;
  report.deleteReason = reason ? String(reason).slice(0, 255) : null;
  await report.save();

  // Soft delete enabled by paranoid mode.
  await report.destroy();
  return report;
}

async function restoreReport(id) {
  const report = await PotholeReport.findByPk(id, { paranoid: false });
  if (!report || !report.deletedAt) {
    return null;
  }

  await report.restore();
  report.deletedByAdminId = null;
  report.deleteReason = null;
  await report.save();

  return report;
}

async function purgeSoftDeletedReports({ olderThanDays = 90 } = {}) {
  const safeDays = Number.isFinite(olderThanDays) ? Math.max(1, olderThanDays) : 90;
  const cutoff = new Date(Date.now() - (safeDays * 24 * 60 * 60 * 1000));

  const reports = await PotholeReport.findAll({
    where: {
      deletedAt: {
        [Op.lt]: cutoff,
      },
    },
    paranoid: false,
  });

  let purged = 0;
  for (const report of reports) {
    if (report.imagePath) {
      const imagePath = path.join(__dirname, '..', 'uploads', report.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await report.destroy({ force: true });
    purged += 1;
  }

  return {
    purged,
    cutoff: cutoff.toISOString(),
  };
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
  restoreReport,
  purgeSoftDeletedReports,
  getStats,
};
