const express = require('express');
const router = express.Router();
const { upload } = require('../services/fileStorageService');
const reportController = require('../controllers/reportController');

// POST /api/reports — submit report with image upload
router.post('/', upload.single('image'), reportController.submitReport);

// GET /api/reports — verified reports for map
router.get('/', reportController.getVerifiedReports);

// GET /api/reports/status/:status — filter by status
router.get('/status/:status', reportController.getReportsByStatus);

// GET /api/reports/:id — single report detail
router.get('/:id', reportController.getReportById);

module.exports = router;
