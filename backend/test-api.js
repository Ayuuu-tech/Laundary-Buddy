// Test API - Login and Get Orders
require('dotenv').config();
const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '240421@bmu.edu.in',
        password: 'ayush@123'  // Change this to your actual password
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      console.log('Please update the password in this script and try again.');
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful!');
    console.log('👤 User:', loginData.user.name);

    // 2. Get Orders
    console.log('\n📦 Fetching orders...');
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const ordersData = await ordersResponse.json();
    console.log('✅ Orders retrieved:', ordersData.orders.length);
    
    if (ordersData.orders.length > 0) {
      console.log('\n📋 Orders:');
      ordersData.orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Items: ${order.items.length}`);
        console.log(`   Amount: ₹${order.totalAmount}`);
        console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('📭 No orders found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
