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

const { Sequelize } = require('sequelize');

let sequelize;

async function connectDB() {
  const uri = process.env.DATABASE_URL;

  if (uri) {
    // Use connection URI (Supabase, Railway, etc.)
    sequelize = new Sequelize(uri, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: false
      }
    });
  } else {
    // Fallback to individual env vars
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'laundry_buddy';
    const username = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';

    sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: false
      }
    });
  }

  await sequelize.authenticate();
  console.log('✅ Connected to PostgreSQL database');

  return sequelize;
}

function getSequelize() {
  return sequelize;
}

module.exports = { connectDB, getSequelize };
