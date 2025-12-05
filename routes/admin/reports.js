const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/admin/reportsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Reports
router.get('/', adminAuth, reportsController.getReports);
router.post('/:id/seen', adminAuth, reportsController.markReportSeen);
router.delete('/:id', adminAuth, reportsController.deleteReport);

// Report Categories
router.get('/categories', adminAuth, reportsController.getReportCategories);
router.post('/categories', adminAuth, reportsController.createReportCategory);
router.put('/categories/:id', adminAuth, reportsController.updateReportCategory);
router.delete('/categories/:id', adminAuth, reportsController.deleteReportCategory);

module.exports = router;
