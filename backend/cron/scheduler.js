/**
 * ============================================================================
 * LAUNDRY BUDDY - Smart Laundry Management System
 * ============================================================================
 *
 * @project   Laundry Buddy
 * @author    Ayush
 * @status    Production Ready
 * @description Part of the Laundry Buddy Evaluation Project.
 *              Handles core application logic, API routing, and database integrations.
 * ============================================================================
 */

const { getUserModel } = require('../models/User');
const { getSecurityLogModel } = require('../models/SecurityLog');
const { Op } = require('sequelize');

const cleanup = async () => {
  console.log('🧹 Running system cleanup...');
  try {
    const User = getUserModel();
    const SecurityLog = getSecurityLogModel();
    const now = new Date();

    // 1. Clear expired OTPs (User model fields)
    await User.update(
      { signupOTP: null, signupOTPExpiry: null, loginOTP: null, loginOTPExpiry: null, resetOTP: null, resetOTPExpiry: null },
      {
        where: {
          [Op.or]: [
            { signupOTPExpiry: { [Op.lt]: now } },
            { loginOTPExpiry: { [Op.lt]: now } },
            { resetOTPExpiry: { [Op.lt]: now } }
          ]
        }
      }
    );

    // 2. Clear old Security Logs (retention: 30 days)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const logsResult = await SecurityLog.destroy({ where: { timestamp: { [Op.lt]: thirtyDaysAgo } } });
    console.log(`- Deleted ${logsResult} old security logs`);

    // 3. Clear expired sessions (connect-pg-simple handles this automatically)

    // 4. Clear expired refresh tokens
    try {
      const { getRefreshTokenModel } = require('../models/RefreshToken');
      const RefreshToken = getRefreshTokenModel();
      const expiredTokens = await RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: now } } });
      console.log(`- Deleted ${expiredTokens} expired refresh tokens`);
    } catch (e) {
      // RefreshToken model might not be initialized yet
    }

    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

const startScheduler = () => {
  // Run once on startup (delayed to ensure models are initialized)
  setTimeout(cleanup, 5000);

  // Run every 24 hours
  setInterval(cleanup, 24 * 60 * 60 * 1000);
};

module.exports = { startScheduler };
