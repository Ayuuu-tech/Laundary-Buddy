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

let ContactMessage;

function initContactMessage(sequelize) {
  ContactMessage = sequelize.define('ContactMessage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      set(value) {
        this.setDataValue('email', value ? value.toLowerCase().trim() : value);
      }
    },
    hostelRoom: {
      type: DataTypes.STRING(50),
      defaultValue: null
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'read', 'replied', 'resolved', 'closed'),
      defaultValue: 'pending'
    },
    staffResponse: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    respondedById: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    respondedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    }
  }, {
    tableName: 'contact_messages',
    timestamps: true
  });

  return ContactMessage;
}

function getContactMessageModel() {
  if (!ContactMessage) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initContactMessage(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return ContactMessage;
}

module.exports = { initContactMessage, getContactMessageModel };
