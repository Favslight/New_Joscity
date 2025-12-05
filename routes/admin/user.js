const express = require('express');
const router = express.Router();
const usersController = require('../../controller/admin/usersController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, usersController.getUsers);
router.get('/:id', adminAuth, usersController.getUser);
router.post('/:id/approve', adminAuth, usersController.approveUser);
router.post('/:id/ban', adminAuth, usersController.banUser);
router.post('/:id/unban', adminAuth, usersController.unbanUser);
router.post('/:id/verify', adminAuth, usersController.verifyUser);
router.put('/:id/group', adminAuth, usersController.updateUserGroup);
router.delete('/:id', adminAuth, usersController.deleteUser);

module.exports = router;
