const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env');
    throw new Error('MONGODB_URI not configured');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    autoIndex: true,
    maxPoolSize: 100, // Handle up to 100 concurrent DB connections for 20K+ users
    minPoolSize: 10, // Keep 10 connections alive to prevent connection overhead spikes
  });

  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
  return mongoose;
}

module.exports = connectDB;
