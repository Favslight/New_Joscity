const express = require('express');
const router = express.Router();
const monetizationController = require('../../controller/admin/monetizationController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/payments', adminAuth, monetizationController.getMonetizationPayments);
router.post('/payments/:id/approve', adminAuth, monetizationController.approveMonetizationPayment);
router.post('/payments/:id/reject', adminAuth, monetizationController.rejectMonetizationPayment);
router.get('/stats', adminAuth, monetizationController.getMonetizationStats);

module.exports = router;
