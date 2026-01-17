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
    maxPoolSize: 10, // Maintain up to 10 socket connections (M0-M10 optimum)
  });

  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
  return mongoose;
}

module.exports = connectDB;
