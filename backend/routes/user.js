// User Data Management Routes
// Add this to backend/routes/user.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { sessionTimeoutMiddleware } = require('../middleware/auth-security');
const dataExportController = require('../controllers/dataExportController');

// All routes require authentication
router.use(sessionTimeoutMiddleware);
router.use(authMiddleware);

// Export user data (GDPR compliance)
router.get('/export-data', dataExportController.exportUserData);

// Delete account
router.delete('/delete-account', dataExportController.deleteUserAccount);

// Request account deletion (staged deletion)
router.post('/request-deletion', dataExportController.requestAccountDeletion);

module.exports = router;
