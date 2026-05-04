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
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { initModels } = require('../models/index');
const { getUserModel } = require('../models/User');

async function registerLaundryStaff() {
  try {
    const sequelize = await connectDB();
    initModels(sequelize);
    const User = getUserModel();

    console.log('✅ Connected to PostgreSQL');

    // Laundry staff credentials
    const staffData = {
      name: 'Laundry Manager',
      email: 'laundry@bmu.edu.in',
      password: 'Laundry@123', // Change this password
      phone: '1234567890',
      address: 'Laundry Department',
      isAdmin: true
    };

    // Check if staff already exists
    const existingStaff = await User.findOne({ where: { email: staffData.email } });
    if (existingStaff) {
      if (!existingStaff.isAdmin) {
        console.log('⚠️  Staff exists but missing admin privileges. Updating...');
        existingStaff.isAdmin = true;
        const hashedPassword = await bcrypt.hash(staffData.password, 10);
        existingStaff.password = hashedPassword;
        await existingStaff.save();

        console.log('✅ Laundry staff updated successfully!');
        console.log('📧 Email:', staffData.email);
        console.log('🔑 Password:', staffData.password);
        console.log('👮 Admin Status: true');
      } else {
        console.log('⚠️  Laundry staff already exists with admin privileges:', staffData.email);
        console.log('Staff details:', {
          name: existingStaff.name,
          email: existingStaff.email,
          isAdmin: existingStaff.isAdmin
        });
      }
      await sequelize.close();
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
    console.log('🔑 Password:', staffData.password);
    console.log('👤 Name:', staffData.name);
    console.log('⚡ Admin privileges: Enabled');
    console.log('\n🚀 You can now login to laundry dashboard with these credentials!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

registerLaundryStaff();
