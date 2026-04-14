const frontendTelemetryService = require('../services/frontendTelemetryService');

async function ingestFrontendEvent(req, res, next) {
  try {
    const payload = req.body || {};
    await frontendTelemetryService.recordFrontendTelemetry(req, payload);
    res.status(202).json({ status: 'accepted' });
  } catch (err) {
    if (err.message === 'eventType is required') {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

module.exports = {
  ingestFrontendEvent,
};