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
const {
  parseTrustProxy,
  getAllowedOrigins,
  validateProductionConfig,
  getSessionSecret,
} = require('./config/runtime');

const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fileRoutes = require('./routes/fileRoutes');

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

// CORS with origin whitelist
const ALLOWED_ORIGINS = getAllowedOrigins(process.env.ALLOWED_ORIGINS);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
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

// Routes
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

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Validate required config in production
    validateProductionConfig(process.env);

    await sequelize.authenticate();
    console.log('Database connected successfully.');

    if (!isProduction) {
      await sequelize.sync();
      console.log('Models synchronized.');
    } else {
      console.log('Skipping sequelize.sync() in production. Run "npm run db:init" once on first deploy.');
    }

    await sessionStore.sync();

    server = app.listen(PORT, () => {
      console.log(`PotholeSafe API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
