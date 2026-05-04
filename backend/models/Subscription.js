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

const { DataTypes } = require('sequelize');
const { getSequelize } = require('../config/db');

let Subscription;

function initSubscription(sequelize) {
  Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.TEXT,
      defaultValue: null
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    indexes: [
      { fields: ['userId'] }
    ]
  });

  return Subscription;
}

function getSubscriptionModel() {
  if (!Subscription) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initSubscription(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return Subscription;
}

module.exports = { initSubscription, getSubscriptionModel };
