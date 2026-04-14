const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseTrustProxy,
  getAllowedOrigins,
  validateProductionConfig,
  getSessionSecret,
  isMetricsEnabled,
  isMetricsAuthorized,
  DEFAULT_ALLOWED_ORIGINS,
} = require('../config/runtime');

test('parseTrustProxy handles booleans and numeric values', () => {
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('1'), true);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('0'), false);
  assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy('loopback'), 'loopback');
});

test('getAllowedOrigins returns defaults when input is empty', () => {
  assert.deepEqual(getAllowedOrigins(''), DEFAULT_ALLOWED_ORIGINS);
  assert.deepEqual(getAllowedOrigins(undefined), DEFAULT_ALLOWED_ORIGINS);
});

test('getAllowedOrigins trims values and removes duplicates', () => {
  const parsed = getAllowedOrigins(' https://a.com, https://b.com,https://a.com ');
  assert.deepEqual(parsed, ['https://a.com', 'https://b.com']);
});

test('validateProductionConfig skips checks outside production', () => {
  assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }));
});

test('validateProductionConfig throws when required vars are missing in production', () => {
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(64) }),
    /Missing required environment variables/
  );
});

test('validateProductionConfig throws when session secret is too short in production', () => {
  const env = {
    NODE_ENV: 'production',
    DB_HOST: 'localhost',
    DB_NAME: 'potholesafe',
    DB_USER: 'root',
    DB_PASSWORD: 'password',
    ALLOWED_ORIGINS: 'http://localhost:5500',
    SESSION_SECRET: 'short-secret',
  };

  assert.throws(() => validateProductionConfig(env), /SESSION_SECRET must be at least 32 characters/);
});

test('validateProductionConfig passes when all required vars are present', () => {
  const env = {
    NODE_ENV: 'production',
    DB_HOST: 'localhost',
    DB_NAME: 'potholesafe',
    DB_USER: 'root',
    DB_PASSWORD: 'password',
    ALLOWED_ORIGINS: 'http://localhost:5500',
    SESSION_SECRET: 'a'.repeat(64),
  };

  assert.doesNotThrow(() => validateProductionConfig(env));
});

test('getSessionSecret returns secure development fallback only outside production', () => {
  assert.equal(getSessionSecret({ NODE_ENV: 'development' }), 'potholesafe-dev-session-secret');
  assert.throws(() => getSessionSecret({ NODE_ENV: 'production' }), /SESSION_SECRET must be set in production/);
  assert.equal(getSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'a'.repeat(64) }), 'a'.repeat(64));
});

test('isMetricsEnabled handles boolean-like values', () => {
  assert.equal(isMetricsEnabled({ ENABLE_METRICS: 'true' }), true);
  assert.equal(isMetricsEnabled({ ENABLE_METRICS: '1' }), true);
  assert.equal(isMetricsEnabled({ ENABLE_METRICS: 'false' }), false);
  assert.equal(isMetricsEnabled({ ENABLE_METRICS: undefined }), false);
});

test('isMetricsAuthorized allows all requests when token is not configured', () => {
  const req = { headers: {}, query: {} };
  assert.equal(isMetricsAuthorized(req, {}), true);
});

test('isMetricsAuthorized validates bearer token and query token', () => {
  const env = { METRICS_TOKEN: 'secret-token' };

  const bearerReq = {
    headers: { authorization: 'Bearer secret-token' },
    query: {},
  };
  assert.equal(isMetricsAuthorized(bearerReq, env), true);

  const queryReq = {
    headers: {},
    query: { token: 'secret-token' },
  };
  assert.equal(isMetricsAuthorized(queryReq, env), true);

  const invalidReq = {
    headers: { authorization: 'Bearer wrong-token' },
    query: {},
  };
  assert.equal(isMetricsAuthorized(invalidReq, env), false);
});
