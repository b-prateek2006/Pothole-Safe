const fs = require('fs');
const xss = require('xss');
const potholeService = require('../services/potholeService');
const { verifyImage } = require('../services/imageVerificationService');
const { upload } = require('../services/fileStorageService');

function cleanupFile(file) {
  if (file && file.path) {
    fs.unlink(file.path, () => {});
  }
}

// POST /api/reports — submit a new report
async function submitReport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { latitude, longitude, description } = req.body;

    if (!latitude || !longitude) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Latitude and longitude must be valid numbers' });
    }

    if (lat < -90 || lat > 90) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (lng < -180 || lng > 180) {
      cleanupFile(req.file);
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    const sanitizedDescription = description ? xss(description.trim()).substring(0, 500) : null;

    let verification;
    try {
      verification = await verifyImage(req.file.path);
    } catch (verifyErr) {
      cleanupFile(req.file);
      return res.status(500).json({ error: 'Image verification failed. Please try again.' });
    }

    const report = await potholeService.createReport({
      imagePath: req.file.filename,
      latitude: lat,
      longitude: lng,
      description: sanitizedDescription,
      confidenceScore: verification.confidence,
    });

    res.status(201).json(report);
  } catch (err) {
    cleanupFile(req.file);
    next(err);
  }
}

// GET /api/reports — list verified reports (for map)
async function getVerifiedReports(req, res, next) {
  try {
    const reports = await potholeService.getVerifiedReports();
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:id — single report detail
async function getReportById(req, res, next) {
  try {
    const report = await potholeService.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/status/:status — filter by status
async function getReportsByStatus(req, res, next) {
  try {
    const status = req.params.status.toUpperCase();
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use PENDING, VERIFIED, or REJECTED.' });
    }
    const reports = await potholeService.getReportsByStatus(status);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitReport, getVerifiedReports, getReportById, getReportsByStatus };
