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

/* eslint-disable no-console */
// Script to fix laundry staff admin status
// Run with: node backend/scripts/fix-laundry-admin.js

require('dotenv').config();
const { connectDB } = require('../config/db');
const { initModels } = require('../models/index');
const { getUserModel } = require('../models/User');
const { Op } = require('sequelize');

async function fixLaundryAdmin() {
  try {
    const sequelize = await connectDB();
    initModels(sequelize);
    const User = getUserModel();

    console.log('✅ Connected to PostgreSQL');

    // Find all potential staff/laundry accounts and make them admin
    const staffEmails = [
      'laundry@bmu.edu.in'
    ];

    for (const email of staffEmails) {
      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (user) {
        if (!user.isAdmin) {
          user.isAdmin = true;
          await user.save();
          console.log(`✅ Updated ${email} - isAdmin: true`);
        } else {
          console.log(`ℹ️  ${email} already has admin rights`);
        }
      } else {
        console.log(`⚠️  User not found: ${email}`);
      }
    }

    // Also check if the currently logged in staff user needs fixing
    const recentUsers = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: '%laundry%' } },
          { name: { [Op.like]: '%laundry%' } },
          { address: { [Op.like]: '%laundry%' } }
        ]
      }
    });

    console.log('\n📋 Found potential laundry staff accounts:');
    for (const user of recentUsers) {
      console.log(`   - ${user.email} (isAdmin: ${user.isAdmin})`);
      if (!user.isAdmin) {
        user.isAdmin = true;
        await user.save();
        console.log('     ✅ Updated to admin');
      }
    }

    console.log('\n✅ Done!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixLaundryAdmin();
