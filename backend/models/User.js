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

let User;

function initUser(sequelize) {
  User = sequelize.define('User', {
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
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', value ? value.toLowerCase() : value);
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      defaultValue: ''
    },
    address: {
      type: DataTypes.STRING(500),
      defaultValue: ''
    },
    hostelRoom: {
      type: DataTypes.STRING(50),
      defaultValue: ''
    },
    googleId: {
      type: DataTypes.STRING(255),
      defaultValue: null
    },
    profilePhoto: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resetOTP: {
      type: DataTypes.STRING(10),
      defaultValue: null
    },
    resetOTPExpiry: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    signupOTP: {
      type: DataTypes.STRING(10),
      defaultValue: null
    },
    signupOTPExpiry: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    loginOTP: {
      type: DataTypes.STRING(10),
      defaultValue: null
    },
    loginOTPExpiry: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    // Account security fields
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    accountLockedUntil: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    lastLoginIP: {
      type: DataTypes.STRING(45),
      defaultValue: null
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    // Account deletion fields
    deletionRequested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletionRequestedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    deletionReason: {
      type: DataTypes.TEXT,
      defaultValue: null
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { fields: ['email'], unique: true }
    ]
  });

  // Instance method: check if account is locked
  User.prototype.isAccountLocked = function () {
    return !!(this.accountLockedUntil && this.accountLockedUntil > Date.now());
  };

  // Instance method: increment failed login attempts
  User.prototype.incrementLoginAttempts = async function () {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 15 * 60 * 1000;

    this.failedLoginAttempts += 1;

    if (this.failedLoginAttempts >= maxAttempts) {
      this.accountLockedUntil = new Date(Date.now() + lockoutDuration);
    }

    return this.save();
  };

  // Instance method: reset failed login attempts
  User.prototype.resetLoginAttempts = async function () {
    this.failedLoginAttempts = 0;
    this.accountLockedUntil = null;
    return this.save();
  };

  return User;
}

function getUserModel() {
  if (!User) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initUser(sequelize);
    }
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return User;
}

module.exports = { initUser, getUserModel };
