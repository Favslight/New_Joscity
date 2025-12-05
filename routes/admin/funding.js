const express = require('express');
const router = express.Router();
const fundingController = require('../../controller/admin/fundingController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Funding Requests
router.get('/requests', adminAuth, fundingController.getFundingRequests);
router.delete('/requests/:id', adminAuth, fundingController.deleteFundingRequest);

// Payments
router.get('/payments', adminAuth, fundingController.getFundingPayments);
router.post('/payments/:id/approve', adminAuth, fundingController.approveFundingPayment);

module.exports = router;
