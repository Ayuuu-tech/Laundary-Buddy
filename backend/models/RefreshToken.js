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

let RefreshToken;

function initRefreshToken(sequelize) {
  RefreshToken = sequelize.define('RefreshToken', {
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
    token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { fields: ['userId'] }
    ]
  });

  return RefreshToken;
}

function getRefreshTokenModel() {
  if (!RefreshToken) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initRefreshToken(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return RefreshToken;
}

module.exports = { initRefreshToken, getRefreshTokenModel };
