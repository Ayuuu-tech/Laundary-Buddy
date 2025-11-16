require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Tracking = require('../models/Tracking');

async function readJSON(p) {
  try {
    const data = await fs.readFile(p, 'utf8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');

  await mongoose.connect(uri, { autoIndex: true });
  console.log('✅ Connected to MongoDB for migration');

  const dataDir = path.join(__dirname, '..', 'data');

  const usersPath = path.join(dataDir, 'users.json');
  const ordersPath = path.join(dataDir, 'orders.json');
  const trackingPath = path.join(dataDir, 'laundry-tracking.json');

  const users = await readJSON(usersPath);
  const orders = await readJSON(ordersPath);
  const tracking = await readJSON(trackingPath);

  // Users
  console.log(`→ Migrating ${users.length} users`);
  for (const u of users) {
    const existing = await User.findOne({ email: (u.email || '').toLowerCase() });
    if (existing) continue;
    await User.create({
      name: u.name,
      email: (u.email || '').toLowerCase(),
      password: u.password, // already hashed in file-based store
      phone: u.phone || '',
      address: u.address || '',
      createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
      updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined,
    });
  }

  // Build email->id map
  const allUsers = await User.find({});
  const userByEmail = new Map(allUsers.map(x => [x.email, x]));

  // Orders
  console.log(`→ Migrating ${orders.length} orders`);
  const orderIdMap = new Map();
  for (const o of orders) {
    let user = null;
    if (o.email) user = userByEmail.get((o.email || '').toLowerCase());
    // fallback: try to parse from address
    if (!user && o.address && o.address.includes('@')) {
      const maybe = (o.address.match(/[\w.-]+@[\w.-]+/g) || [])[0];
      if (maybe) user = userByEmail.get(maybe.toLowerCase());
    }
    // if still not found, assign to first user (optional)
    if (!user && allUsers.length) user = allUsers[0];

    const created = await Order.create({
      user: user?._id,
      orderNumber: o.orderNumber || ('ORD' + Date.now()),
      serviceType: o.serviceType,
      pickupDate: o.pickupDate,
      pickupTime: o.pickupTime,
      deliveryDate: o.deliveryDate,
      items: o.items || [],
      totalAmount: o.totalAmount || 0,
      address: o.address || '',
      phone: o.phone || '',
      specialInstructions: o.specialInstructions || '',
      status: o.status || 'pending',
      paymentStatus: o.paymentStatus || 'pending',
      createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
      updatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
    });
    orderIdMap.set(o.id || o._id || created.orderNumber, created._id);
  }

  // Tracking
  console.log(`→ Migrating ${tracking.length} tracking items`);
  for (const t of tracking) {
    // try to link order
    let orderId = null;
    if (t.orderId && orderIdMap.has(t.orderId)) orderId = orderIdMap.get(t.orderId);

    await Tracking.create({
      user: (allUsers[0]?._id) || undefined,
      order: orderId || undefined,
      orderNumber: t.orderNumber,
      status: t.status || 'picked_up',
      currentLocation: t.currentLocation || '',
      estimatedDelivery: t.estimatedDelivery || '',
      timeline: t.timeline || [],
      createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
    });
  }

  console.log('✅ Migration finished');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
