const express = require('express');
const router = express.Router();
const pagesController = require('../../controllers/admin/pagesController');
const { adminAuth } = require('../../middleware/adminMiddleware');

router.get('/', adminAuth, pagesController.getPages);
router.get('/:id', adminAuth, pagesController.getPage);
router.post('/:id/verify', adminAuth, pagesController.verifyPage);
router.delete('/:id', adminAuth, pagesController.deletePage);

module.exports = router;
