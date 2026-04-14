const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'potholesafe_' });

const labelNames = ['method', 'route', 'status_code'];

const httpRequestsTotal = new client.Counter({
  name: 'potholesafe_http_requests_total',
  help: 'Total HTTP requests handled by the API',
  labelNames,
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'potholesafe_http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

function resolveRoute(req) {
  if (req.route && req.route.path) {
    const routePath = typeof req.route.path === 'string' ? req.route.path : req.path;
    return `${req.baseUrl || ''}${routePath}`;
  }

  return req.path || 'unknown';
}

function metricsMiddleware(req, res, next) {
  const stopTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: resolveRoute(req),
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    stopTimer(labels);
  });

  next();
}

async function metricsHandler(req, res) {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
};