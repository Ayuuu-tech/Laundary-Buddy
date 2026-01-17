const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const mongoose = require('mongoose');

const cleanup = async () => {
    console.log('🧹 Running system cleanup...');
    try {
        // 1. Clear expired OTPs (User model fields)
        const now = new Date();
        await User.updateMany(
            { $or: [{ signupOTPExpiry: { $lt: now } }, { loginOTPExpiry: { $lt: now } }, { resetOTPExpiry: { $lt: now } }] },
            { $unset: { signupOTP: 1, signupOTPExpiry: 1, loginOTP: 1, loginOTPExpiry: 1, resetOTP: 1, resetOTPExpiry: 1 } }
        );

        // 2. Clear old Security Logs (retention: 30 days)
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const logsResult = await SecurityLog.deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
        console.log(`- Deleted ${logsResult.deletedCount} old security logs`);

        // 3. Clear expired sessions (MongoStore handles this automatically)

        console.log('✅ Cleanup complete');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};

const startScheduler = () => {
    // Run once on startup
    cleanup();

    // Run every 24 hours
    setInterval(cleanup, 24 * 60 * 60 * 1000);
};

module.exports = { startScheduler };
