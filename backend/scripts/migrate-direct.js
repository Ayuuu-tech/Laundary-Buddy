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

/**
 * ============================================================
 * DIRECT MongoDB Atlas → Supabase PostgreSQL Migration
 * ============================================================
 * Connects to both databases and migrates data in real-time.
 * No JSON export needed!
 * ============================================================
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { connectDB } = require('../config/db');
const { initModels } = require('../models/index');

// MongoDB Atlas URI
const MONGO_URI = 'mongodb+srv://ayushmaanyadav24cse_db_user:Ayush2006@laundarybuddy.g8aype3.mongodb.net/laundry_buddy?retryWrites=true&w=majority&appName=laundarybuddy';

async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  MongoDB Atlas → Supabase PostgreSQL Migration       ║');
  console.log('║  Direct Connection — No JSON Export Needed!          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // ==========================================
  // 1. Connect to MongoDB Atlas
  // ==========================================
  console.log('🔌 Step 1: Connecting to MongoDB Atlas...');
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const mongoDB = mongoClient.db('laundry_buddy');
  console.log('✅ Connected to MongoDB Atlas!');

  // List all collections
  const collections = await mongoDB.listCollections().toArray();
  console.log(`\n📋 Found ${collections.length} collections in MongoDB:`);
  for (const col of collections) {
    const count = await mongoDB.collection(col.name).countDocuments();
    console.log(`   • ${col.name}: ${count} documents`);
  }
  console.log('');

  // ==========================================
  // 2. Connect to Supabase PostgreSQL
  // ==========================================
  console.log('🔌 Step 2: Connecting to Supabase PostgreSQL...');
  const sequelize = await connectDB();
  initModels(sequelize);
  await sequelize.sync(); // Ensure tables exist
  console.log('✅ Connected to Supabase!\n');

  // Import models
  const { getUserModel } = require('../models/User');
  const { getOrderModel } = require('../models/Order');
  const { getTrackingModel } = require('../models/Tracking');

  const User = getUserModel();
  const Order = getOrderModel();
  const Tracking = getTrackingModel();

  // ID Mapping: MongoDB _id → PostgreSQL id
  const userIdMap = {};
  const orderIdMap = {};

  const stats = { inserted: 0, skipped: 0, errors: 0 };

  // ==========================================
  // 3. Migrate Users
  // ==========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 STEP 3: Migrating Users...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const mongoUsers = await mongoDB.collection('users').find({}).toArray();
  console.log(`   Found ${mongoUsers.length} users in MongoDB\n`);

  for (const mu of mongoUsers) {
    try {
      const email = (mu.email || '').toLowerCase().trim();
      if (!email) {
        console.log('   ⚠️  Skipped — no email');
        stats.skipped++;
        continue;
      }

      // Check if already exists in PostgreSQL
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        console.log(`   ⏭️  Exists: ${email} (pgId: ${existing.id})`);
        userIdMap[mu._id.toString()] = existing.id;
        userIdMap[email] = existing.id;
        stats.skipped++;
        continue;
      }

      // Map MongoDB → PostgreSQL
      const userData = {
        name: mu.name || mu.fullName || 'Unknown',
        email: email,
        password: mu.password || 'NO_PASSWORD_SET',
        phone: mu.phone || mu.mobile || '',
        address: mu.address || '',
        hostelRoom: mu.hostelRoom || mu.room || mu.hostel || '',
        googleId: mu.googleId || null,
        profilePhoto: mu.profilePhoto || mu.avatar || null,
        isAdmin: mu.isAdmin || mu.role === 'admin' || mu.role === 'laundry' || false,
        lastLoginAt: mu.lastLoginAt || mu.lastLogin || null,
        lastLoginIP: mu.lastLoginIP || null,
        createdAt: mu.createdAt || new Date(),
        updatedAt: mu.updatedAt || new Date()
      };

      const created = await User.create(userData);
      userIdMap[mu._id.toString()] = created.id;
      userIdMap[email] = created.id;
      console.log(`   ✅ Migrated: ${email} → pgId: ${created.id}`);
      stats.inserted++;
    } catch (err) {
      console.error(`   ❌ Error: ${mu.email} — ${err.message}`);
      stats.errors++;
    }
  }
  console.log('');

  // ==========================================
  // 4. Migrate Orders
  // ==========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 STEP 4: Migrating Orders...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const mongoOrders = await mongoDB.collection('orders').find({}).toArray();
  console.log(`   Found ${mongoOrders.length} orders in MongoDB\n`);

  for (const mo of mongoOrders) {
    try {
      // Find user ID mapping
      const mongoUserId = (mo.userId || mo.user || '').toString();
      const pgUserId = userIdMap[mongoUserId];

      if (!pgUserId) {
        // Try to find by looking up email if userId is embedded
        console.log(`   ⚠️  Order skipped — user not found for mongoId: ${mongoUserId}`);
        stats.skipped++;
        continue;
      }

      // Generate order number if missing
      const orderNumber = mo.orderNumber || mo.orderNo || mo.token ||
        `LB-MIG-${new Date(mo.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // Check if already exists
      const existing = await Order.findOne({ where: { orderNumber } });
      if (existing) {
        console.log(`   ⏭️  Exists: ${orderNumber} (pgId: ${existing.id})`);
        orderIdMap[mo._id.toString()] = existing.id;
        stats.skipped++;
        continue;
      }

      const orderData = {
        userId: pgUserId,
        orderNumber,
        serviceType: mo.serviceType || mo.service || null,
        pickupDate: mo.pickupDate || null,
        pickupTime: mo.pickupTime || null,
        deliveryDate: mo.deliveryDate || null,
        items: Array.isArray(mo.items) ? mo.items : (mo.items ? [mo.items] : []),
        totalAmount: mo.totalAmount || mo.total || mo.amount || 0,
        address: mo.address || mo.pickupAddress || null,
        phone: mo.phone || null,
        specialInstructions: mo.specialInstructions || mo.notes || mo.instructions || null,
        status: normalizeStatus(mo.status),
        paymentStatus: mo.paymentStatus || 'pending',
        feedbackRating: mo.feedbackRating || mo.rating || null,
        feedbackComment: mo.feedbackComment || mo.review || null,
        feedbackSubmittedAt: mo.feedbackSubmittedAt || null,
        createdAt: mo.createdAt || new Date(),
        updatedAt: mo.updatedAt || new Date()
      };

      const created = await Order.create(orderData);
      orderIdMap[mo._id.toString()] = created.id;
      console.log(`   ✅ Migrated: ${orderNumber} (user: ${pgUserId}) → pgId: ${created.id}`);
      stats.inserted++;
    } catch (err) {
      console.error(`   ❌ Error order: ${err.message}`);
      stats.errors++;
    }
  }
  console.log('');

  // ==========================================
  // 5. Migrate Tracking
  // ==========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 STEP 5: Migrating Tracking...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check if tracking collection exists
  const colNames = collections.map(c => c.name);
  if (!colNames.includes('tracking') && !colNames.includes('trackings')) {
    console.log('   ℹ️  No tracking collection found in MongoDB. Skipping.');
  } else {
    const trackingCol = colNames.includes('tracking') ? 'tracking' : 'trackings';
    const mongoTracking = await mongoDB.collection(trackingCol).find({}).toArray();
    console.log(`   Found ${mongoTracking.length} tracking records in MongoDB\n`);

    for (const mt of mongoTracking) {
      try {
        const mongoUserId = (mt.userId || mt.user || '').toString();
        const mongoOrderId = (mt.orderId || mt.order || '').toString();
        const pgUserId = userIdMap[mongoUserId];
        const pgOrderId = orderIdMap[mongoOrderId];

        if (!pgUserId) {
          console.log('   ⚠️  Tracking skipped — user not mapped');
          stats.skipped++;
          continue;
        }

        // Check duplicate
        if (pgOrderId) {
          const existing = await Tracking.findOne({ where: { orderId: pgOrderId } });
          if (existing) {
            console.log(`   ⏭️  Tracking exists for orderId: ${pgOrderId}`);
            stats.skipped++;
            continue;
          }
        }

        const trackData = {
          userId: pgUserId,
          orderId: pgOrderId || null,
          orderNumber: mt.orderNumber || null,
          status: normalizeStatus(mt.status),
          currentLocation: mt.currentLocation || null,
          estimatedDelivery: mt.estimatedDelivery || null,
          notifyWhenReady: mt.notifyWhenReady || false,
          timeline: Array.isArray(mt.timeline) ? mt.timeline : [],
          createdAt: mt.createdAt || new Date(),
          updatedAt: mt.updatedAt || new Date()
        };

        await Tracking.create(trackData);
        console.log(`   ✅ Migrated tracking for order: ${mt.orderNumber || pgOrderId}`);
        stats.inserted++;
      } catch (err) {
        console.error(`   ❌ Error tracking: ${err.message}`);
        stats.errors++;
      }
    }
  }
  console.log('');

  // ==========================================
  // 6. Check for other collections to migrate
  // ==========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 STEP 6: Checking other collections...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const knownCollections = ['users', 'orders', 'tracking', 'trackings', 'sessions'];
  const otherCollections = collections.filter(c => !knownCollections.includes(c.name));

  if (otherCollections.length > 0) {
    console.log(`   Found ${otherCollections.length} additional collections:`);
    for (const col of otherCollections) {
      const count = await mongoDB.collection(col.name).countDocuments();
      const sample = await mongoDB.collection(col.name).findOne({});
      console.log(`   • ${col.name} (${count} docs)`);
      if (sample) {
        console.log(`     Fields: ${Object.keys(sample).join(', ')}`);
      }
    }
    console.log('\n   ℹ️  These collections were not auto-migrated.');
    console.log('       If needed, you can add migration logic for them.');
  } else {
    console.log('   No additional collections found.');
  }

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║            ✅ MIGRATION COMPLETE!                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Inserted:  ${String(stats.inserted).padEnd(38)}║`);
  console.log(`║  ⏭️  Skipped:   ${String(stats.skipped).padEnd(38)}║`);
  console.log(`║  ❌ Errors:    ${String(stats.errors).padEnd(38)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  User ID Mappings (MongoDB → PostgreSQL):           ║');

  const mappingEntries = Object.entries(userIdMap).filter(([k]) => k.includes('@'));
  for (const [email, pgId] of mappingEntries.slice(0, 10)) {
    console.log(`║    ${email.padEnd(35)} → ${String(pgId).padEnd(6)}║`);
  }
  if (mappingEntries.length > 10) {
    console.log(`║    ... and ${mappingEntries.length - 10} more                          ║`);
  }

  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Check your data at:                                 ║');
  console.log('║  • Supabase Dashboard → Table Editor                 ║');
  console.log('║  • http://localhost:3000/logs.html                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Close connections
  await mongoClient.close();
  await sequelize.close();
  console.log('\n🔒 Both database connections closed.');
  process.exit(0);
}

// Normalize status values
function normalizeStatus(status) {
  if (!status) {
    return 'pending';
  }
  const map = {
    'Pending': 'pending', 'PENDING': 'pending',
    'Submitted': 'submitted', 'submitted': 'submitted',
    'Received': 'received', 'received': 'received',
    'Washing': 'washing', 'WASHING': 'washing', 'In Progress': 'washing', 'in-progress': 'washing',
    'Drying': 'drying', 'drying': 'drying',
    'Folding': 'folding', 'folding': 'folding',
    'Ready': 'ready-for-pickup', 'Ready for Pickup': 'ready-for-pickup', 'READY': 'ready-for-pickup',
    'ready': 'ready-for-pickup', 'ready-for-pickup': 'ready-for-pickup',
    'Delivered': 'delivered', 'delivered': 'delivered',
    'Completed': 'completed', 'COMPLETED': 'completed', 'completed': 'completed',
    'Cancelled': 'cancelled', 'CANCELLED': 'cancelled', 'cancelled': 'cancelled'
  };
  return map[status] || status.toLowerCase();
}

// Run
migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
