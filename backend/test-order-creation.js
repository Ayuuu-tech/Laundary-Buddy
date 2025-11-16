// Test Order Creation Script
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');

async function testOrderCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get first user
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found. Please create a user first.');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Create test order
    const testOrder = await Order.create({
      user: user._id,
      orderNumber: 'TEST' + Date.now(),
      serviceType: 'regular',
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: '10:00',
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          type: 'regular',
          count: 5,
          color: 'mixed'
        }
      ],
      totalAmount: 50,
      address: user.hostelRoom || 'Test Room',
      phone: user.phone || '1234567890',
      specialInstructions: 'Test order from script',
      status: 'pending',
      paymentStatus: 'pending'
    });

    console.log('✅ Test order created:', testOrder.orderNumber);
    console.log('📦 Order details:', JSON.stringify(testOrder, null, 2));

    // Check total orders
    const totalOrders = await Order.countDocuments();
    console.log(`✅ Total orders in database: ${totalOrders}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testOrderCreation();
