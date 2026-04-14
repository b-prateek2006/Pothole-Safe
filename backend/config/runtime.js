const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
];

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

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET', 'ALLOWED_ORIGINS'];
  const missing = requiredEnvVars.filter((name) => !env[name] || !env[name].trim());

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

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  parseTrustProxy,
  getAllowedOrigins,
  validateProductionConfig,
  getSessionSecret,
};