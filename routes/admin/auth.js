//This code is to authenticate the user/business
const express = require('express');
const router = express.Router();
const authController = require('../../controller/authController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Admin approval routes
router.get('/pending', adminAuth, authController.getPendingApprovals);
router.post('/approve', adminAuth, authController.approveAccount);
router.post('/reject', adminAuth, authController.rejectAccount);

module.exports = router;
