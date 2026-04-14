require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./models');
const { errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/requestId');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');
const {
  parseTrustProxy,
  getAllowedOrigins,
  getAllowedOriginPatterns,
  isOriginAllowed,
  validateProductionConfig,
  getSessionSecret,
  isMetricsEnabled,
  isMetricsAuthorized,
  isFrontendTelemetryEnabled,
} = require('./config/runtime');

const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fileRoutes = require('./routes/fileRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
let server;
let isShuttingDown = false;

async function sendReadiness(res) {
  try {
    await sequelize.authenticate();
    return res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: 'not_ready',
      error: 'database_unavailable',
      timestamp: new Date().toISOString(),
    });
  }
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => {
      server.close((err) => {
        if (err) {
          console.error('Error closing HTTP server:', err.message);
        }
        resolve();
      });
    });
  }

  try {
    await sequelize.close();
  } catch (err) {
    console.error('Error closing database connection:', err.message);
  }

  process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  shutdown('UNHANDLED_REJECTION', 1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION', 1);
});

app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Security headers
app.use(helmet());

// Request correlation ID
app.use(requestId);

// Request logging
morgan.token('request-id', (req) => req.requestId || '-');
app.use(morgan(isProduction
  ? ':date[iso] :method :url :status :response-time ms req_id=:request-id'
  : ':method :url :status :response-time ms req_id=:request-id'));

// Request metrics
app.use(metricsMiddleware);

// CORS with origin whitelist
const ALLOWED_ORIGINS = getAllowedOrigins(process.env.ALLOWED_ORIGINS);
const ALLOWED_ORIGIN_PATTERNS = getAllowedOriginPatterns(process.env.ALLOWED_ORIGIN_PATTERNS);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin, ALLOWED_ORIGINS, ALLOWED_ORIGIN_PATTERNS)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// Body parsers
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '1mb';
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// Session store (MySQL-backed)
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000,
});

app.use(session({
  secret: getSessionSecret(process.env),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many reports submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many telemetry events. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
if (isFrontendTelemetryEnabled(process.env)) {
  app.use('/api/telemetry', telemetryLimiter, telemetryRoutes);
}

app.use('/api/reports', reportLimiter, reportRoutes);
app.use('/api/admin/login', loginLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

// Health checks
app.get('/api/health/live', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', async (req, res) => {
  return sendReadiness(res);
});

app.get('/api/health', async (req, res) => {
  return sendReadiness(res);
});

if (isMetricsEnabled(process.env)) {
  app.get('/api/metrics', async (req, res) => {
    if (!isMetricsAuthorized(req, process.env)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return metricsHandler(req, res);
  });
}

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Validate required config in production
    validateProductionConfig(process.env);

    await sequelize.authenticate();
    console.log('Database connected successfully.');
    console.log('Automatic schema sync is disabled. Run "npm run db:init" on first deploy and "npm run migrate" for updates.');

    server = app.listen(PORT, () => {
      console.log(`PotholeSafe API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
