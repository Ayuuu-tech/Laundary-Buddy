// User Data Management Routes
// Add this to backend/routes/user.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { sessionTimeoutMiddleware } = require('../middleware/auth-security');
const authController = require('../controllers/authController');
const dataExportController = require('../controllers/dataExportController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for local storage (fallback if cloud upload fails)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profiles';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// All routes require authentication
router.use(sessionTimeoutMiddleware);
router.use(authMiddleware);

// Profile Management
router.put('/profile', authController.updateProfile);
router.post('/profile-photo', upload.single('photo'), authController.uploadProfilePhoto);

// Export user data (GDPR compliance)
router.get('/export-data', dataExportController.exportUserData);

// Delete account
router.delete('/delete-account', dataExportController.deleteUserAccount);

// Request account deletion (staged deletion)
router.post('/request-deletion', dataExportController.requestAccountDeletion);

module.exports = router;
