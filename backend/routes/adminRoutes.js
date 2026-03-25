const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// POST /api/admin/login — no auth needed
router.post('/login', adminController.login);

// POST /api/admin/logout — requires auth
router.post('/logout', requireAdmin, adminController.logout);

// Protected admin routes
router.get('/reports', requireAdmin, adminController.getAllReports);
router.get('/reports/export', requireAdmin, adminController.exportReports);
router.put('/reports/:id/verify', requireAdmin, adminController.verifyReport);
router.put('/reports/:id/reject', requireAdmin, adminController.rejectReport);
router.delete('/reports/:id', requireAdmin, adminController.deleteReport);
router.get('/stats', requireAdmin, adminController.getStats);

module.exports = router;
