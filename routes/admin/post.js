const express = require('express');
const router = express.Router();
const postsController = require('../../controller/admin/postsController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, postsController.getPosts);
router.get('/:id', adminAuth, postsController.getPost);
router.post('/:id/approve', adminAuth, postsController.approvePost);
router.delete('/:id', adminAuth, postsController.deletePost);

module.exports = router;
