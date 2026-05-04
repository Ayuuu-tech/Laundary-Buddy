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

let Tracking;

function initTracking(sequelize) {
  Tracking = sequelize.define('Tracking', {
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
    orderId: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      defaultValue: null
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'pending'
    },
    currentLocation: {
      type: DataTypes.STRING(255),
      defaultValue: null
    },
    estimatedDelivery: {
      type: DataTypes.STRING(100),
      defaultValue: null
    },
    notifyWhenReady: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    timeline: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'tracking',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['orderId'] },
      { fields: ['orderNumber'] }
    ]
  });

  return Tracking;
}

function getTrackingModel() {
  if (!Tracking) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initTracking(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return Tracking;
}

module.exports = { initTracking, getTrackingModel };
