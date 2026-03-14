/* eslint-disable no-console */
// Script to fix laundry staff admin status
// Run with: node backend/scripts/fix-laundry-admin.js

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixLaundryAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all potential staff/laundry accounts and make them admin
    const staffEmails = [
      'laundry@bmu.edu.in'
      // Add any other staff emails here
    ];

    for (const email of staffEmails) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        if (!user.isAdmin || !user.isEmailVerified) {
          user.isAdmin = true;
          user.isEmailVerified = true;  // Required for /auth/login to work
          await user.save();
          console.log(`✅ Updated ${email} - isAdmin: true, isEmailVerified: true`);
        } else {
          console.log(`ℹ️  ${email} already has admin rights and email verified`);
        }
      } else {
        console.log(`⚠️  User not found: ${email}`);
      }
    }

    // Also check if the currently logged in staff user needs fixing
    // Find users who logged in from laundry dashboard (you may need to identify them differently)
    const recentUsers = await User.find({
      $or: [
        { email: { $regex: 'laundry', $options: 'i' } },
        { name: { $regex: 'laundry', $options: 'i' } },
        { address: { $regex: 'laundry', $options: 'i' } }
      ]
    });

    console.log('\n📋 Found potential laundry staff accounts:');
    for (const user of recentUsers) {
      console.log(`   - ${user.email} (isAdmin: ${user.isAdmin}, isEmailVerified: ${user.isEmailVerified})`);
      if (!user.isAdmin || !user.isEmailVerified) {
        user.isAdmin = true;
        user.isEmailVerified = true;  // Required for /auth/login to work
        await user.save();
        console.log('     ✅ Updated to admin + email verified');
      }
    }

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixLaundryAdmin();
