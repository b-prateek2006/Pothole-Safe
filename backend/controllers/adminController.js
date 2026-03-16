const bcrypt = require('bcryptjs');
const { AdminUser } = require('../models');
const potholeService = require('../services/potholeService');

// POST /api/admin/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await AdminUser.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate session to prevent session fixation
    const adminId = admin.id;
    const adminUsername = admin.username;
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = adminId;
      res.json({ message: 'Login successful', username: adminUsername });
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/logout
async function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

// GET /api/admin/reports — all reports
async function getAllReports(req, res, next) {
  try {
    const reports = await potholeService.getAllReports();
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id/verify
async function verifyReport(req, res, next) {
  try {
    const report = await potholeService.updateStatus(req.params.id, 'VERIFIED');
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id/reject
async function rejectReport(req, res, next) {
  try {
    const report = await potholeService.updateStatus(req.params.id, 'REJECTED');
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/stats
async function getStats(req, res, next) {
  try {
    const stats = await potholeService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, getAllReports, verifyReport, rejectReport, getStats };
