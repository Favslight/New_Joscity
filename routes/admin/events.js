const express = require('express');
const router = express.Router();
const eventsController = require('../../controllers/admin/eventsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, eventsController.getEvents);
router.get('/:id', adminAuth, eventsController.getEvent);
router.delete('/:id', adminAuth, eventsController.deleteEvent);

module.exports = router;
