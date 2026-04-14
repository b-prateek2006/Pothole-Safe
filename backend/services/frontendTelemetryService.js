const { FrontendTelemetryEvent } = require('../models');

const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'error']);

function trim(value, maxLength) {
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

function parseClientTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return timestamp;
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  try {
    const serialized = JSON.stringify(metadata);
    if (!serialized || serialized.length > 5000) {
      return null;
    }
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

async function recordFrontendTelemetry(req, payload) {
  const eventType = trim(payload.eventType, 100);
  if (!eventType) {
    throw new Error('eventType is required');
  }

  const severityCandidate = trim(payload.severity, 20);
  const severity = severityCandidate && ALLOWED_SEVERITIES.has(severityCandidate)
    ? severityCandidate
    : 'error';

  const event = await FrontendTelemetryEvent.create({
    eventType,
    severity,
    message: trim(payload.message, 2000),
    pageUrl: trim(payload.pageUrl, 500),
    requestId: trim(req.requestId, 64),
    userAgent: trim(req.headers['user-agent'], 255),
    clientTimestamp: parseClientTimestamp(payload.clientTimestamp),
    metadata: sanitizeMetadata(payload.metadata),
  });

  return event;
}

module.exports = {
  recordFrontendTelemetry,
};