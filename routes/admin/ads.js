const express = require('express');
const router = express.Router();
const adsController = require('../../controllers/admin/adsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Users Ads
router.get('/users', adminAuth, adsController.getUsersAds);
router.post('/users/:id/approve', adminAuth, adsController.approveUserAd);
router.post('/users/:id/decline', adminAuth, adsController.declineUserAd);

// System Ads
router.get('/system', adminAuth, adsController.getSystemAds);
router.get('/system/:id', adminAuth, adsController.getSystemAd);
router.post('/system', adminAuth, adsController.createSystemAd);
router.put('/system/:id', adminAuth, adsController.updateSystemAd);
router.delete('/system/:id', adminAuth, adsController.deleteSystemAd);

module.exports = router;
