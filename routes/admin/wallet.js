const express = require('express');
const router = express.Router();
const walletController = require('../../controllers/admin/walletController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/payments', adminAuth, walletController.getWalletPaymentRequests);
router.post('/payments/:id/approve', adminAuth, walletController.approveWalletPayment);
router.post('/payments/:id/reject', adminAuth, walletController.rejectWalletPayment);

module.exports = router;
