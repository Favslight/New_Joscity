const express = require('express');
const router = express.Router();
const settingsController = require('../../controller/admin/settingsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, settingsController.getSettings);
router.put('/', adminAuth, settingsController.updateSettings);
router.get('/registration', adminAuth, settingsController.getRegistrationSettings);
router.put('/registration', adminAuth, settingsController.updateRegistrationSettings);

module.exports = router;
