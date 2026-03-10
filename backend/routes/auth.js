
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/security');
const { validate, validationRules } = require('../middleware/validation');
const { refreshAccessToken, revokeRefreshToken, sessionTimeoutMiddleware } = require('../middleware/auth-security');

// ─── Public Routes (with rate limiting) ──────────────────────────────

// OTP-based signup (primary signup flow — email verified)
router.post('/request-signup-otp', authLimiter, otpLimiter, validate(validationRules.register), authController.requestSignupOTP);
router.post('/verify-signup-otp', authLimiter, authController.verifySignupOTP);

// OTP-based login
router.post('/request-login-otp', authLimiter, otpLimiter, validate(validationRules.login), authController.requestLoginOTP);
router.post('/verify-login-otp', authLimiter, authController.verifyLoginOTP);

// Direct login (with validation)
router.post('/login', authLimiter, validate(validationRules.login), authController.login);
router.post('/logout', authController.logout);

// Password reset OTP
router.post('/request-reset-otp', authLimiter, otpLimiter, authController.requestPasswordResetOTP);
router.post('/verify-reset-otp', authLimiter, authController.verifyOTPAndResetPassword);

// Token refresh and revocation (public — token validates itself)
router.post('/refresh-token', authLimiter, refreshAccessToken);

// ─── Protected Routes ────────────────────────────────────────────────

router.post('/revoke-token', authMiddleware, revokeRefreshToken);
router.get('/me', sessionTimeoutMiddleware, authMiddleware, authController.getCurrentUser);
router.put('/change-password', sessionTimeoutMiddleware, authMiddleware, authController.changePassword);

module.exports = router;
