function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error
  if (!isProduction) {
    console.error('Error:', err.stack || err.message);
  } else {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      error: err.message,
    }));
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  // Multer file type error
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors.map(e => e.path);
    return res.status(409).json({ error: `Duplicate value for: ${fields.join(', ')}` });
  }

  // Sequelize database error
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({ error: 'A database error occurred' });
  }

  // Sequelize connection refused
  if (err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }

  // Default
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
}

module.exports = { errorHandler };
