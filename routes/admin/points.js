const express = require('express');
const router = express.Router();
const pointsController = require('../../controller/admin/pointsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/payments', adminAuth, pointsController.getPointsPayments);
router.post('/payments/:id/approve', adminAuth, pointsController.approvePointsPayment);
router.post('/payments/:id/reject', adminAuth, pointsController.rejectPointsPayment);

module.exports = router;
