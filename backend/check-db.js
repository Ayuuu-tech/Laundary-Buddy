// Quick script to check database contents
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/laundry_buddy');
    console.log('✅ Connected to MongoDB\n');

    // Check users
    const users = await User.find().select('-password');
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
    const sessionsCollection = mongoose.connection.db.collection('sessions');
    const sessions = await sessionsCollection.find().toArray();
    console.log('\n🔐 ACTIVE SESSIONS:');
    console.log('===================');
    console.log(`Total Sessions: ${sessions.length}\n`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();
