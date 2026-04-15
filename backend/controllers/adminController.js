const bcrypt = require('bcryptjs');
const { AdminUser } = require('../models');
const potholeService = require('../services/potholeService');
const adminAuditService = require('../services/adminAuditService');

// POST /api/admin/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      await adminAuditService.recordAuditEvent({
        req,
        action: 'ADMIN_LOGIN_FAILED',
        success: false,
        metadata: { reason: 'missing_credentials', username: username || null },
      });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await AdminUser.findOne({ where: { username } });
    if (!admin) {
      await adminAuditService.recordAuditEvent({
        req,
        action: 'ADMIN_LOGIN_FAILED',
        success: false,
        metadata: { reason: 'user_not_found', username },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      await adminAuditService.recordAuditEvent({
        req,
        adminUserId: admin.id,
        action: 'ADMIN_LOGIN_FAILED',
        success: false,
        metadata: { reason: 'invalid_password', username },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate session to prevent session fixation
    const adminId = admin.id;
    const adminUsername = admin.username;
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = adminId;

      adminAuditService.recordAuditEvent({
        req,
        adminUserId: adminId,
        action: 'ADMIN_LOGIN_SUCCESS',
        success: true,
        metadata: { username: adminUsername },
      }).catch(() => {
        // Audit failures should not block successful login.
      });

      res.json({ message: 'Login successful', username: adminUsername });
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/logout
async function logout(req, res, next) {
  const adminId = req.session?.adminId || null;

  await adminAuditService.recordAuditEvent({
    req,
    adminUserId: adminId,
    action: 'ADMIN_LOGOUT',
    success: true,
  });

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

// GET /api/admin/reports — all reports with pagination
async function getAllReports(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    const includeDeleted = String(req.query.includeDeleted || '').toLowerCase() === 'true';
    const statusParam = req.query.status ? String(req.query.status).toUpperCase() : 'ALL';
    const allowedStatuses = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'];

    if (!allowedStatuses.includes(statusParam)) {
      return res.status(400).json({ error: 'Invalid status filter. Use ALL, PENDING, VERIFIED, or REJECTED.' });
    }

    const status = statusParam === 'ALL' ? null : statusParam;

    // Cap limit to prevent memory exhaustion
    if (limit > 100) limit = 100;
    const result = await potholeService.getAllReports({ page, limit, includeDeleted, status });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id/verify
async function verifyReport(req, res, next) {
  try {
    const report = await potholeService.updateStatus(req.params.id, 'VERIFIED');
    if (!report) {
      await adminAuditService.recordAuditEvent({
        req,
        adminUserId: req.session?.adminId || null,
        action: 'REPORT_VERIFY_FAILED',
        targetType: 'report',
        targetId: req.params.id,
        success: false,
        metadata: { reason: 'not_found' },
      });
      return res.status(404).json({ error: 'Report not found' });
    }

    await adminAuditService.recordAuditEvent({
      req,
      adminUserId: req.session?.adminId || null,
      action: 'REPORT_VERIFIED',
      targetType: 'report',
      targetId: String(report.id),
      success: true,
      metadata: { verificationStatus: report.verificationStatus },
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id/reject
async function rejectReport(req, res, next) {
  try {
    const report = await potholeService.updateStatus(req.params.id, 'REJECTED');
    if (!report) {
      await adminAuditService.recordAuditEvent({
        req,
        adminUserId: req.session?.adminId || null,
        action: 'REPORT_REJECT_FAILED',
        targetType: 'report',
        targetId: req.params.id,
        success: false,
        metadata: { reason: 'not_found' },
      });
      return res.status(404).json({ error: 'Report not found' });
    }

    await adminAuditService.recordAuditEvent({
      req,
      adminUserId: req.session?.adminId || null,
      action: 'REPORT_REJECTED',
      targetType: 'report',
      targetId: String(report.id),
      success: true,
      metadata: { verificationStatus: report.verificationStatus },
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/reports/:id
async function deleteReport(req, res, next) {
  try {
    const deleteReason = req.body?.reason
      ? String(req.body.reason).trim().slice(0, 255)
      : null;

    const report = await potholeService.deleteReport(req.params.id, {
      adminId: req.session?.adminId || null,
      reason: deleteReason,
    });

    if (!report) {
      await adminAuditService.recordAuditEvent({
        req,
        adminUserId: req.session?.adminId || null,
        action: 'REPORT_DELETE_FAILED',
        targetType: 'report',
        targetId: req.params.id,
        success: false,
        metadata: { reason: 'not_found' },
      });
      return res.status(404).json({ error: 'Report not found' });
    }

    await adminAuditService.recordAuditEvent({
      req,
      adminUserId: req.session?.adminId || null,
      action: 'REPORT_DELETED',
      targetType: 'report',
      targetId: String(report.id),
      success: true,
      metadata: {
        imagePath: report.imagePath || null,
        deleteReason,
        deletionType: 'soft',
      },
    });

    res.json({ message: 'Report soft-deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id/restore
async function restoreReport(req, res, next) {
  try {
    const report = await potholeService.restoreReport(req.params.id);
    if (!report) {
      await adminAuditService.recordAuditEvent({
        req,
        adminUserId: req.session?.adminId || null,
        action: 'REPORT_RESTORE_FAILED',
        targetType: 'report',
        targetId: req.params.id,
        success: false,
        metadata: { reason: 'not_found_or_not_deleted' },
      });
      return res.status(404).json({ error: 'Deleted report not found' });
    }

    await adminAuditService.recordAuditEvent({
      req,
      adminUserId: req.session?.adminId || null,
      action: 'REPORT_RESTORED',
      targetType: 'report',
      targetId: String(report.id),
      success: true,
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/stats
async function getStats(req, res, next) {
  try {
    const stats = await potholeService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/reports/export — CSV export
async function exportReports(req, res, next) {
  try {
    const { reports } = await potholeService.getAllReports({ page: 1, limit: 10000 });

    const headers = ['ID', 'Latitude', 'Longitude', 'Description', 'Status', 'Confidence', 'Created At'];
    const csvRows = [headers.join(',')];

    // Sanitize cell for CSV formula injection
    const sanitizeCell = (value) => {
      const str = String(value || '');
      // Prefix with single quote if starts with formula characters
      if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${str.replace(/"/g, '""')}"`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    reports.forEach(report => {
      const row = [
        report.id,
        report.latitude,
        report.longitude,
        sanitizeCell(report.description),
        report.verificationStatus,
        report.confidenceScore ? (report.confidenceScore * 100).toFixed(0) + '%' : 'N/A',
        new Date(report.createdAt).toISOString(),
      ];
      csvRows.push(row.join(','));
    });

    await adminAuditService.recordAuditEvent({
      req,
      adminUserId: req.session?.adminId || null,
      action: 'REPORTS_EXPORTED',
      targetType: 'report',
      success: true,
      metadata: { exportedCount: reports.length },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pothole-reports.csv');
    res.send(csvRows.join('\n'));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs
async function getAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (limit > 100) limit = 100;

    const action = req.query.action ? String(req.query.action).trim() : null;
    const result = await adminAuditService.getAuditLogs({ page, limit, action });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  getAllReports,
  verifyReport,
  rejectReport,
  deleteReport,
  restoreReport,
  getStats,
  exportReports,
  getAuditLogs,
};
