const { AdminAuditLog } = require('../models');

function trimValue(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

async function recordAuditEvent({
  req,
  adminUserId = null,
  action,
  targetType = null,
  targetId = null,
  success = true,
  metadata = null,
}) {
  if (!action) {
    return null;
  }

  const safeMetadata = metadata && typeof metadata === 'object' ? metadata : null;

  try {
    return await AdminAuditLog.create({
      adminUserId,
      action: trimValue(action, 100),
      targetType: trimValue(targetType, 100),
      targetId: trimValue(targetId, 100),
      success: Boolean(success),
      requestId: trimValue(req.requestId, 64),
      ipAddress: trimValue(getClientIp(req), 64),
      userAgent: trimValue(req.headers['user-agent'], 255),
      metadata: safeMetadata,
    });
  } catch (err) {
    console.error('Failed to write admin audit event:', err.message);
    return null;
  }
}

async function getAuditLogs({ page = 1, limit = 20, action = null } = {}) {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 20;

  const where = {};
  if (action) {
    where.action = action;
  }

  const { count, rows } = await AdminAuditLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    logs: rows,
    total: count,
    page: safePage,
    totalPages: Math.ceil(count / safeLimit),
  };
}

module.exports = {
  recordAuditEvent,
  getAuditLogs,
};