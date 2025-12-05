// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const businessController = require('../controller/businessController');

// Personal routes
router.post('/personal/signup', authController.personalSignup);
router.post('/personal/login', authController.personalSignIn);

// Business routes
router.post('/business/signup', businessController.businessSignup);
router.post('/business/login', businessController.businessSignIn);

// Shared routes (handled by authController)
router.get('/admin/pending', authController.getPendingApprovals);
router.post('/admin/approve', authController.approveAccount);
router.post('/admin/reject', authController.rejectAccount);
router.post('/forgot-password', authController.forgetPassword);
router.post('/confirm-reset', authController.forgetPasswordConfirm);
router.post('/reset-password', authController.forgetPasswordReset);
router.post('/resend-activation', authController.resendActivation);
router.post('/logout', authController.signOut);

// Business-specific routes
router.get('/business/profile', businessController.getBusinessProfile);
router.put('/business/update', businessController.updateBusinessDetails);

module.exports = router;