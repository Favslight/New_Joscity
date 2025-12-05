const express = require('express');
const router = express.Router();
const groupsController = require('../../controller/admin/groupsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, groupsController.getGroups);
router.get('/:id', adminAuth, groupsController.getGroup);
router.delete('/:id', adminAuth, groupsController.deleteGroup);

module.exports = router;