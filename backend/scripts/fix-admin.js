const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update the laundry staff user
    const result = await User.updateOne(
      { email: 'laundry@bmu.edu.in' },
      { $set: { isAdmin: true } }
    );

    console.log('Update result:', result);

    // Verify the update
    const user = await User.findOne({ email: 'laundry@bmu.edu.in' });
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

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();
