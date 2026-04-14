const express = require('express');
const telemetryController = require('../controllers/telemetryController');

const router = express.Router();

// POST /api/telemetry/frontend
router.post('/frontend', telemetryController.ingestFrontendEvent);

module.exports = router;