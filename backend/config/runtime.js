const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
];

const DEFAULT_ALLOWED_ORIGIN_PATTERNS = [];

function parseTrustProxy(value) {
  if (value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;

  const numeric = Number.parseInt(normalized, 10);
  if (!Number.isNaN(numeric)) return numeric;

  return value;
}

function getAllowedOrigins(value) {
  if (!value || !value.trim()) {
    return [...DEFAULT_ALLOWED_ORIGINS];
  }

  const uniqueOrigins = new Set(
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  return Array.from(uniqueOrigins);
}

function wildcardToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`, 'i');
}

function getAllowedOriginPatterns(value) {
  if (!value || !value.trim()) {
    return [...DEFAULT_ALLOWED_ORIGIN_PATTERNS];
  }

  const uniquePatterns = new Set(
    value
      .split(',')
      .map((pattern) => pattern.trim())
      .filter(Boolean)
  );

  return Array.from(uniquePatterns).map((pattern) => wildcardToRegex(pattern));
}

function isOriginAllowed(origin, allowedOrigins, allowedOriginPatterns = []) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];
  const missing = requiredEnvVars.filter((name) => !env[name] || !env[name].trim());

  const hasAllowedOrigins = Boolean(
    (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.trim()) ||
    (env.ALLOWED_ORIGIN_PATTERNS && env.ALLOWED_ORIGIN_PATTERNS.trim())
  );

  if (!hasAllowedOrigins) {
    missing.push('ALLOWED_ORIGINS or ALLOWED_ORIGIN_PATTERNS');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }

  if (env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
}

function getSessionSecret(env = process.env) {
  if (env.SESSION_SECRET && env.SESSION_SECRET.trim()) {
    return env.SESSION_SECRET;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }

  return 'potholesafe-dev-session-secret';
}

function isMetricsEnabled(env = process.env) {
  const value = String(env.ENABLE_METRICS || '').trim().toLowerCase();
  return value === 'true' || value === '1';
}

function isFrontendTelemetryEnabled(env = process.env) {
  const value = String(env.ENABLE_FRONTEND_TELEMETRY || '').trim().toLowerCase();
  if (!value) {
    return true;
  }

  return value === 'true' || value === '1';
}

function isMetricsAuthorized(req, env = process.env) {
  const expectedToken = env.METRICS_TOKEN && env.METRICS_TOKEN.trim();
  if (!expectedToken) {
    return true;
  }

  const authorization = req.headers?.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    const bearerToken = authorization.slice('Bearer '.length).trim();
    return bearerToken === expectedToken;
  }

  const queryToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
  return queryToken === expectedToken;
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_ALLOWED_ORIGIN_PATTERNS,
  parseTrustProxy,
  getAllowedOrigins,
  getAllowedOriginPatterns,
  isOriginAllowed,
  validateProductionConfig,
  getSessionSecret,
  isMetricsEnabled,
  isMetricsAuthorized,
  isFrontendTelemetryEnabled,
};