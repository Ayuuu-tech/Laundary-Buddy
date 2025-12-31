
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// OTP-based signup
router.post('/request-signup-otp', authController.requestSignupOTP);
router.post('/verify-signup-otp', authController.verifySignupOTP);
// OTP-based login
router.post('/request-login-otp', authController.requestLoginOTP);
router.post('/verify-login-otp', authController.verifyLoginOTP);

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
// Password reset OTP request
router.post('/request-reset-otp', authController.requestPasswordResetOTP);
// OTP verification and password reset
router.post('/verify-reset-otp', authController.verifyOTPAndResetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
