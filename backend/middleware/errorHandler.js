function errorHandler(err, req, res, _next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.requestId || 'unknown';

  // Log error
  if (!isProduction) {
    console.error(`Error [${requestId}]:`, err.stack || err.message);
  } else {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl,
      error: err.message,
    }));
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.', requestId });
  }

  // Multer file type error
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message, requestId });
  }

  // CORS error
  if (typeof err.message === 'string' && err.message.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ error: 'Origin not allowed', requestId });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages, requestId });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors.map(e => e.path);
    return res.status(409).json({ error: `Duplicate value for: ${fields.join(', ')}`, requestId });
  }

  // Sequelize database error
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({ error: 'A database error occurred', requestId });
  }

  // Sequelize connection refused
  if (err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({ error: 'Service temporarily unavailable', requestId });
  }

  // Default
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    requestId,
  });
}

module.exports = { errorHandler };
