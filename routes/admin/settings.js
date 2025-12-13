const express = require('express');
const router = express.Router();
const settingsController = require('../../controller/admin/settingsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.get('/registration', settingsController.getRegistrationSettings);
router.put('/registration', settingsController.updateRegistrationSettings);

module.exports = router;
