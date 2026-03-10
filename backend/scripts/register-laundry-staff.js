const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function registerLaundryStaff() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Laundry staff credentials
    const password = process.env.ADMIN_PASSWORD || process.argv[2];
    if (!password) {
      console.error('❌ Password required. Provide via ADMIN_PASSWORD env var or as CLI argument.');
      console.error('Usage: ADMIN_PASSWORD=<pass> node register-laundry-staff.js');
      console.error('   or: node register-laundry-staff.js <password>');
      process.exit(1);
    }

    const staffData = {
      name: 'Laundry Manager',
      email: process.env.ADMIN_EMAIL || 'laundry@bmu.edu.in',
      password: password,
      phone: '1234567890',
      address: 'Laundry Department',
      isAdmin: true
    };

    // Check if staff already exists
    const existingStaff = await User.findOne({ email: staffData.email });
    if (existingStaff) {
      // Update if missing admin privileges
      if (!existingStaff.isAdmin) {
        console.log('⚠️  Staff exists but missing admin privileges. Updating...');
        existingStaff.isAdmin = true;
        const hashedPassword = await bcrypt.hash(staffData.password, 10);
        existingStaff.password = hashedPassword;
        await existingStaff.save();
        
        console.log('✅ Laundry staff updated successfully!');
        console.log('📧 Email:', staffData.email);
        console.log(' Admin Status: true');
      } else {
        console.log('⚠️  Laundry staff already exists with admin privileges:', staffData.email);
        console.log('Staff details:', {
          name: existingStaff.name,
          email: existingStaff.email,
          isAdmin: existingStaff.isAdmin
        });
      }
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(staffData.password, 10);

    // Create laundry staff
    const staff = await User.create({
      name: staffData.name,
      email: staffData.email.toLowerCase(),
      password: hashedPassword,
      phone: staffData.phone,
      address: staffData.address,
      isAdmin: true
    });

    console.log('✅ Laundry staff registered successfully!');
    console.log('📧 Email:', staffData.email);
    console.log(' Name:', staffData.name);
    console.log('⚡ Admin privileges: Enabled');
    console.log('\n🚀 You can now login to laundry dashboard with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

registerLaundryStaff();
