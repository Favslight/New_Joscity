const express = require('express');
const router = express.Router();
const affiliatesController = require('../../controller/admin/affiliatesController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/payments', adminAuth, affiliatesController.getAffiliatePayments);
router.post('/payments/:id/approve', adminAuth, affiliatesController.approveAffiliatePayment);
router.post('/payments/:id/reject', adminAuth, affiliatesController.rejectAffiliatePayment);
router.get('/stats', adminAuth, affiliatesController.getAffiliateStats);

module.exports = router;
