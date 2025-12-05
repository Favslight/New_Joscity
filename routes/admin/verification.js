const express = require('express');
const router = express.Router();
const verificationController = require('../../controller/admin/verificationController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Verification Requests
router.get('/requests', adminAuth, verificationController.getVerificationRequests);
router.post('/requests/:id/approve', adminAuth, verificationController.approveVerification);
router.post('/requests/:id/reject', adminAuth, verificationController.rejectVerification);

// Verified Entities
router.get('/users', adminAuth, verificationController.getVerifiedUsers);
router.get('/pages', adminAuth, verificationController.getVerifiedPages);
router.delete('/:type/:id', adminAuth, verificationController.removeVerification);

module.exports = router;
