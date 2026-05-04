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

let ActivityLog;

function initActivityLog(sequelize) {
  ActivityLog = sequelize.define('ActivityLog', {
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
    userName: {
      type: DataTypes.STRING(255),
      defaultValue: null
    },
    userEmail: {
      type: DataTypes.STRING(255),
      defaultValue: null
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'HTTP method: GET, POST, PUT, DELETE, PATCH'
    },
    route: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'API endpoint path'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      comment: 'HTTP response status code'
    },
    responseTime: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      comment: 'Response time in milliseconds'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      defaultValue: null
    },
    userAgent: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    requestBody: {
      type: DataTypes.JSON,
      defaultValue: null,
      comment: 'Sanitized request body (no passwords)'
    },
    description: {
      type: DataTypes.STRING(500),
      defaultValue: null,
      comment: 'Human-readable description of the action'
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
      comment: 'Category: auth, order, profile, admin, support, tracking, etc.'
    },
    severity: {
      type: DataTypes.STRING(20),
      defaultValue: 'info',
      comment: 'info, warning, error, critical'
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['action'] },
      { fields: ['route'] },
      { fields: ['category'] },
      { fields: ['severity'] },
      { fields: ['createdAt'] },
      { fields: ['userId', 'createdAt'] },
      { fields: ['category', 'createdAt'] }
    ]
  });

  return ActivityLog;
}

function getActivityLogModel() {
  if (!ActivityLog) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initActivityLog(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return ActivityLog;
}

module.exports = { initActivityLog, getActivityLogModel };
