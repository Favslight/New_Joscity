const express = require('express');
const router = express.Router();
const proController = require('../../controllers/admin/proController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Packages
router.get('/packages', adminAuth, proController.getPackages);
router.get('/packages/:id', adminAuth, proController.getPackage);
router.post('/packages', adminAuth, proController.createPackage);
router.put('/packages/:id', adminAuth, proController.updatePackage);
router.delete('/packages/:id', adminAuth, proController.deletePackage);

// Subscribers
router.get('/subscribers', adminAuth, proController.getSubscribers);

module.exports = router;