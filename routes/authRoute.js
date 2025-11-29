const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

// Public routes
router.post('/signup', authController.signUp);
router.post('/signin', authController.signIn);
router.post('/signout', authController.signOut);

// Password reset routes
router.post('/forget_password', authController.forgetPassword);
router.post('/forget_password_confirm', authController.forgetPasswordConfirm);
router.post('/forget_password_reset', authController.forgetPasswordReset);

// Activation routes
router.post('/resend_activation', authController.resendActivation);

module.exports = router;