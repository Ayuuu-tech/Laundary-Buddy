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
 * MongoDB → PostgreSQL (Supabase) Data Migration Script
 * ============================================================
 * 
 * YEH SCRIPT KYA KARTA HAI:
 * 1. MongoDB se export ki gayi JSON files read karta hai
 * 2. Data ko PostgreSQL format mein convert karta hai
 * 3. Supabase PostgreSQL mein INSERT karta hai
 * 
 * USAGE:
 *   Step 1: MongoDB se JSON export karo:
 *     mongoexport --db laundry_buddy --collection users --out scripts/mongo-data/users.json --jsonArray
 *     mongoexport --db laundry_buddy --collection orders --out scripts/mongo-data/orders.json --jsonArray
 *     mongoexport --db laundry_buddy --collection tracking --out scripts/mongo-data/tracking.json --jsonArray
 * 
 *   Step 2: Yeh script run karo:
 *     node scripts/migrate-mongo-to-pg.js
 * 
 * NOTE: 
 *   - Pehle se existing data duplicate nahi hoga (email check karta hai)
 *   - Passwords directly copy hote hain (bcrypt hash dono mein same kaam karta hai)
 *   - MongoDB _id → new PostgreSQL auto-increment id
 * ============================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../config/db');
const { initModels } = require('../models/index');

// ============ CONFIGURATION ============
// JSON files ka path (mongoexport se generate hue)
const DATA_DIR = path.join(__dirname, 'mongo-data');

// Kaunse collections import karne hain
const COLLECTIONS_TO_IMPORT = {
  users: true,
  orders: true,
  tracking: true
};
// ========================================

// Read JSON file safely
function readJsonFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`   ⚠️  File not found: ${filepath}`);
    console.log(`       Skip kar raha hai: ${filename}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(raw);
    console.log(`   ✅ Loaded ${data.length} records from ${filename}`);
    return data;
  } catch (err) {
    console.error(`   ❌ Error reading ${filename}:`, err.message);
    return null;
  }
}

// Map MongoDB user document → PostgreSQL row
function mapMongoUser(mongoUser) {
  return {
    name: mongoUser.name || mongoUser.fullName || 'Unknown',
    email: (mongoUser.email || '').toLowerCase().trim(),
    password: mongoUser.password || '', // bcrypt hash directly copy hota hai
    phone: mongoUser.phone || mongoUser.mobile || '',
    address: mongoUser.address || '',
    hostelRoom: mongoUser.hostelRoom || mongoUser.room || mongoUser.hostel || '',
    googleId: mongoUser.googleId || null,
    profilePhoto: mongoUser.profilePhoto || mongoUser.avatar || null,
    isAdmin: mongoUser.isAdmin || mongoUser.role === 'admin' || mongoUser.role === 'laundry' || false,
    lastLoginAt: mongoUser.lastLogin || mongoUser.lastLoginAt || null,
    lastLoginIP: mongoUser.lastLoginIP || null,
    createdAt: mongoUser.createdAt ? new Date(mongoUser.createdAt.$date || mongoUser.createdAt) : new Date(),
    updatedAt: mongoUser.updatedAt ? new Date(mongoUser.updatedAt.$date || mongoUser.updatedAt) : new Date()
  };
}

// Map MongoDB order document → PostgreSQL row
function mapMongoOrder(mongoOrder, userIdMap) {
  // MongoDB userId could be _id string or ObjectId
  const mongoUserId = mongoOrder.userId?.$oid || mongoOrder.userId || mongoOrder.user?.$oid || mongoOrder.user;
  const pgUserId = userIdMap[mongoUserId];

  if (!pgUserId) {
    console.log(`   ⚠️  Order skipped — user not found: ${mongoUserId}`);
    return null;
  }

  return {
    userId: pgUserId,
    orderNumber: mongoOrder.orderNumber || mongoOrder.orderNo || `LB-MIGRATED-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    serviceType: mongoOrder.serviceType || mongoOrder.service || null,
    pickupDate: mongoOrder.pickupDate || null,
    pickupTime: mongoOrder.pickupTime || null,
    deliveryDate: mongoOrder.deliveryDate || null,
    items: Array.isArray(mongoOrder.items) ? mongoOrder.items : [],
    totalAmount: mongoOrder.totalAmount || mongoOrder.total || mongoOrder.amount || 0,
    address: mongoOrder.address || mongoOrder.pickupAddress || null,
    phone: mongoOrder.phone || null,
    specialInstructions: mongoOrder.specialInstructions || mongoOrder.notes || null,
    status: mapStatus(mongoOrder.status),
    paymentStatus: mongoOrder.paymentStatus || 'pending',
    feedbackRating: mongoOrder.feedbackRating || mongoOrder.rating || null,
    feedbackComment: mongoOrder.feedbackComment || mongoOrder.review || null,
    createdAt: mongoOrder.createdAt ? new Date(mongoOrder.createdAt.$date || mongoOrder.createdAt) : new Date(),
    updatedAt: mongoOrder.updatedAt ? new Date(mongoOrder.updatedAt.$date || mongoOrder.updatedAt) : new Date()
  };
}

// Map MongoDB tracking → PostgreSQL row
function mapMongoTracking(mongoTrack, userIdMap, orderIdMap) {
  const mongoUserId = mongoTrack.userId?.$oid || mongoTrack.userId;
  const mongoOrderId = mongoTrack.orderId?.$oid || mongoTrack.orderId;

  const pgUserId = userIdMap[mongoUserId];
  const pgOrderId = orderIdMap[mongoOrderId];

  if (!pgUserId) {
    console.log(`   ⚠️  Tracking skipped — user not found`);
    return null;
  }

  return {
    userId: pgUserId,
    orderId: pgOrderId || null,
    orderNumber: mongoTrack.orderNumber || null,
    status: mapStatus(mongoTrack.status),
    currentLocation: mongoTrack.currentLocation || null,
    estimatedDelivery: mongoTrack.estimatedDelivery || null,
    notifyWhenReady: mongoTrack.notifyWhenReady || false,
    timeline: Array.isArray(mongoTrack.timeline) ? mongoTrack.timeline : [],
    createdAt: mongoTrack.createdAt ? new Date(mongoTrack.createdAt.$date || mongoTrack.createdAt) : new Date(),
    updatedAt: mongoTrack.updatedAt ? new Date(mongoTrack.updatedAt.$date || mongoTrack.updatedAt) : new Date()
  };
}

// Normalize status values
function mapStatus(status) {
  if (!status) return 'pending';
  const statusMap = {
    'Pending': 'pending',
    'PENDING': 'pending',
    'Submitted': 'submitted',
    'Received': 'received',
    'Washing': 'washing',
    'WASHING': 'washing',
    'In Progress': 'washing',
    'Drying': 'drying',
    'Folding': 'folding',
    'Ready': 'ready-for-pickup',
    'Ready for Pickup': 'ready-for-pickup',
    'READY': 'ready-for-pickup',
    'Delivered': 'delivered',
    'Completed': 'completed',
    'COMPLETED': 'completed',
    'Cancelled': 'cancelled',
    'CANCELLED': 'cancelled'
  };
  return statusMap[status] || status.toLowerCase();
}

// ============ MAIN MIGRATION FUNCTION ============
async function migrate() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  MongoDB → PostgreSQL (Supabase) Migration      ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Laundry Buddy Data Migration Script             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // 1. Check if mongo-data folder exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`❌ Data folder not found: ${DATA_DIR}`);
    console.log('');
    console.log('📋 Steps to follow:');
    console.log('   1. Create folder: mkdir -p backend/scripts/mongo-data');
    console.log('   2. Export MongoDB data:');
    console.log('      mongoexport --db laundry_buddy --collection users --out scripts/mongo-data/users.json --jsonArray');
    console.log('      mongoexport --db laundry_buddy --collection orders --out scripts/mongo-data/orders.json --jsonArray');
    console.log('      mongoexport --db laundry_buddy --collection tracking --out scripts/mongo-data/tracking.json --jsonArray');
    console.log('   3. Run again: node scripts/migrate-mongo-to-pg.js');
    console.log('');
    
    // Create the directory for user convenience
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`📁 Created folder: ${DATA_DIR}`);
    console.log('   Ab JSON files yahan rakh do aur script dobara run karo.');
    process.exit(0);
  }

  // 2. Connect to PostgreSQL (Supabase)
  console.log('🔌 Connecting to Supabase PostgreSQL...');
  const sequelize = await connectDB();
  initModels(sequelize);
  console.log('✅ Connected!\n');

  // Import models
  const { getUserModel } = require('../models/User');
  const { getOrderModel } = require('../models/Order');
  const { getTrackingModel } = require('../models/Tracking');

  const User = getUserModel();
  const Order = getOrderModel();
  const Tracking = getTrackingModel();

  // Track MongoDB _id → PostgreSQL id mapping
  const userIdMap = {};   // mongoId → pgId
  const orderIdMap = {};  // mongoId → pgId

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ==========================================
  // STEP 1: Migrate Users
  // ==========================================
  if (COLLECTIONS_TO_IMPORT.users) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 STEP 1: Migrating Users...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const mongoUsers = readJsonFile('users.json');

    if (mongoUsers) {
      for (const mongoUser of mongoUsers) {
        try {
          const mapped = mapMongoUser(mongoUser);

          if (!mapped.email) {
            console.log(`   ⚠️  Skipped user — no email`);
            totalSkipped++;
            continue;
          }

          // Check if already exists
          const existing = await User.findOne({ where: { email: mapped.email } });
          if (existing) {
            console.log(`   ⏭️  User already exists: ${mapped.email} → pgId: ${existing.id}`);
            const mongoId = mongoUser._id?.$oid || mongoUser._id || mapped.email;
            userIdMap[mongoId] = existing.id;
            userIdMap[mapped.email] = existing.id; // Also map by email
            totalSkipped++;
            continue;
          }

          const created = await User.create(mapped);
          const mongoId = mongoUser._id?.$oid || mongoUser._id || mapped.email;
          userIdMap[mongoId] = created.id;
          userIdMap[mapped.email] = created.id;
          console.log(`   ✅ User migrated: ${mapped.email} → pgId: ${created.id}`);
          totalInserted++;
        } catch (err) {
          console.error(`   ❌ Error migrating user ${mongoUser.email}:`, err.message);
          totalErrors++;
        }
      }
    }
    console.log('');
  }

  // ==========================================
  // STEP 2: Migrate Orders
  // ==========================================
  if (COLLECTIONS_TO_IMPORT.orders) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 STEP 2: Migrating Orders...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const mongoOrders = readJsonFile('orders.json');

    if (mongoOrders) {
      for (const mongoOrder of mongoOrders) {
        try {
          const mapped = mapMongoOrder(mongoOrder, userIdMap);
          if (!mapped) {
            totalSkipped++;
            continue;
          }

          // Check duplicate by orderNumber
          if (mapped.orderNumber) {
            const existing = await Order.findOne({ where: { orderNumber: mapped.orderNumber } });
            if (existing) {
              console.log(`   ⏭️  Order already exists: ${mapped.orderNumber}`);
              const mongoId = mongoOrder._id?.$oid || mongoOrder._id;
              orderIdMap[mongoId] = existing.id;
              totalSkipped++;
              continue;
            }
          }

          const created = await Order.create(mapped);
          const mongoId = mongoOrder._id?.$oid || mongoOrder._id;
          orderIdMap[mongoId] = created.id;
          console.log(`   ✅ Order migrated: ${mapped.orderNumber} → pgId: ${created.id}`);
          totalInserted++;
        } catch (err) {
          console.error(`   ❌ Error migrating order:`, err.message);
          totalErrors++;
        }
      }
    }
    console.log('');
  }

  // ==========================================
  // STEP 3: Migrate Tracking
  // ==========================================
  if (COLLECTIONS_TO_IMPORT.tracking) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 STEP 3: Migrating Tracking...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const mongoTracking = readJsonFile('tracking.json');

    if (mongoTracking) {
      for (const mongoTrack of mongoTracking) {
        try {
          const mapped = mapMongoTracking(mongoTrack, userIdMap, orderIdMap);
          if (!mapped) {
            totalSkipped++;
            continue;
          }

          // Check if tracking already exists for this order
          if (mapped.orderId) {
            const existing = await Tracking.findOne({ where: { orderId: mapped.orderId } });
            if (existing) {
              console.log(`   ⏭️  Tracking already exists for orderId: ${mapped.orderId}`);
              totalSkipped++;
              continue;
            }
          }

          await Tracking.create(mapped);
          console.log(`   ✅ Tracking migrated for order: ${mapped.orderNumber || mapped.orderId}`);
          totalInserted++;
        } catch (err) {
          console.error(`   ❌ Error migrating tracking:`, err.message);
          totalErrors++;
        }
      }
    }
    console.log('');
  }

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║              MIGRATION COMPLETE!                 ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ✅ Inserted:  ${String(totalInserted).padEnd(34)}║`);
  console.log(`║  ⏭️  Skipped:   ${String(totalSkipped).padEnd(34)}║`);
  console.log(`║  ❌ Errors:    ${String(totalErrors).padEnd(34)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Check your data:                                ║');
  console.log('║  • Supabase Dashboard → Table Editor             ║');
  console.log('║  • http://localhost:3000/logs.html (Activity Logs)║');
  console.log('╚══════════════════════════════════════════════════╝');

  await sequelize.close();
  process.exit(0);
}

// Run migration
migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
