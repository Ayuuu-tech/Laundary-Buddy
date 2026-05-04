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

let SupportTicket;

function initSupportTicket(sequelize) {
  SupportTicket = sequelize.define('SupportTicket', {
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
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    orderNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    },
    type: {
      type: DataTypes.ENUM('missing-clothes', 'damage', 'contact'),
      allowNull: false
    },
    items: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    damageType: {
      type: DataTypes.STRING(100),
      defaultValue: null
    },
    details: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    status: {
      type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'closed'),
      defaultValue: 'pending'
    },
    response: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    resolvedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    }
  }, {
    tableName: 'support_tickets',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['orderId'] },
      { fields: ['status'] }
    ]
  });

  return SupportTicket;
}

function getSupportTicketModel() {
  if (!SupportTicket) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initSupportTicket(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return SupportTicket;
}

module.exports = { initSupportTicket, getSupportTicketModel };
