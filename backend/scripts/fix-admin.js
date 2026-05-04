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

require('dotenv').config();
const { connectDB } = require('../config/db');
const { initModels } = require('../models/index');
const { getUserModel } = require('../models/User');

async function fixAdmin() {
  try {
    const sequelize = await connectDB();
    initModels(sequelize);
    const User = getUserModel();

    console.log('✅ Connected to PostgreSQL');

    // Update the laundry staff user
    const [result] = await User.update(
      { isAdmin: true },
      { where: { email: 'laundry@bmu.edu.in' } }
    );

    console.log('Update result:', result, 'row(s) affected');

    // Verify the update
    const user = await User.findOne({ where: { email: 'laundry@bmu.edu.in' } });
    if (user) {
      console.log('\nVerified user:', {
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      });

      if (user.isAdmin === true) {
        console.log('\n✅ SUCCESS! User is now an admin');
      } else {
        console.log('\n❌ FAILED! User isAdmin is:', user.isAdmin);
      }
    } else {
      console.log('\n⚠️ User not found: laundry@bmu.edu.in');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();
