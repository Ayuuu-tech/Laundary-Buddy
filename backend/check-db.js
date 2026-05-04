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

// Quick script to check database contents
require('dotenv').config();

async function checkDatabase() {
  try {
    const { connectDB } = require('./config/db');
    const sequelize = await connectDB();

    const { initModels } = require('./models/index');
    initModels(sequelize);

    const { getUserModel } = require('./models/User');
    const User = getUserModel();

    console.log('✅ Connected to PostgreSQL (Supabase)\n');

    // Check users
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    console.log('👥 USERS IN DATABASE:');
    console.log('=====================');
    console.log(`Total Users: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone || 'Not provided'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

    // Check sessions
    try {
      const [sessions] = await sequelize.query('SELECT COUNT(*) as count FROM "sessions" WHERE expire > NOW()');
      console.log('\n🔐 ACTIVE SESSIONS:');
      console.log('===================');
      console.log(`Total Sessions: ${sessions[0]?.count || 0}\n`);
    } catch (e) {
      console.log('\n🔐 Sessions table not found (will be created when server starts)\n');
    }

    await sequelize.close();
    console.log('\n✅ Database check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
