const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, dashboardController.getDashboard);

module.exports = router;
