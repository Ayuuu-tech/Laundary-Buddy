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

let SecurityLog;

function initSecurityLog(sequelize) {
  SecurityLog = sequelize.define('SecurityLog', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    event: {
      type: DataTypes.ENUM(
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGIN_LOCKED',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_SUCCESS',
        'PASSWORD_CHANGED',
        'ACCOUNT_CREATED',
        'SUSPICIOUS_ACTIVITY',
        'TOKEN_REFRESH',
        'LOGOUT',
        'SQL_INJECTION_ATTEMPT',
        'XSS_ATTEMPT',
        'RATE_LIMIT_EXCEEDED',
        'ADMIN_ACCESS',
        'DATA_EXPORT_REQUEST',
        'ACCOUNT_DELETION_REQUEST',
        'ACCOUNT_DELETION_REQUESTED'
      ),
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      defaultValue: null
    },
    userAgent: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: null
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'security_logs',
    timestamps: false,
    indexes: [
      { fields: ['userId'] },
      { fields: ['event'] },
      { fields: ['timestamp'] },
      { fields: ['userId', 'timestamp'] },
      { fields: ['event', 'timestamp'] }
    ]
  });

  return SecurityLog;
}

function getSecurityLogModel() {
  if (!SecurityLog) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initSecurityLog(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return SecurityLog;
}

module.exports = { initSecurityLog, getSecurityLogModel };
