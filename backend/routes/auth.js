
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/security');
const { refreshAccessToken, revokeRefreshToken, sessionTimeoutMiddleware } = require('../middleware/auth-security');

// Apply auth rate limiting to all auth routes
router.use(authLimiter);

// OTP-based signup
router.post('/request-signup-otp', otpLimiter, authController.requestSignupOTP);
router.post('/verify-signup-otp', authController.verifySignupOTP);
// OTP-based login
router.post('/request-login-otp', otpLimiter, authController.requestLoginOTP);
router.post('/verify-login-otp', authController.verifyLoginOTP);

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Token refresh and revocation
router.post('/refresh-token', refreshAccessToken);
router.post('/revoke-token', authMiddleware, revokeRefreshToken);

// Password reset OTP request
router.post('/request-reset-otp', otpLimiter, authController.requestPasswordResetOTP);
// OTP verification and password reset
router.post('/verify-reset-otp', authController.verifyOTPAndResetPassword);

// Protected routes (with session timeout check)
router.get('/me', sessionTimeoutMiddleware, authMiddleware, authController.getCurrentUser);
router.put('/profile', sessionTimeoutMiddleware, authMiddleware, authController.updateProfile);
router.put('/change-password', sessionTimeoutMiddleware, authMiddleware, authController.changePassword);

module.exports = router;
