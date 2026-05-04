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

/**
 * Global Order Model Reference
 * @type {import('sequelize').ModelCtor<import('sequelize').Model>}
 */
let Order;

/**
 * Initializes the Order model with its schema definition and constraints.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize database connection instance.
 * @returns {import('sequelize').ModelCtor<import('sequelize').Model>} The initialized Order model.
 */
function initOrder(sequelize) {
  Order = sequelize.define('Order', {
    /**
     * Primary Key for the Order
     */
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    /**
     * Foreign Key referencing the User who placed the order
     */
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    /**
     * Unique alphanumeric tracking number for the order
     */
    orderNumber: {
      type: DataTypes.STRING(50),
      unique: true
    },
    /**
     * Type of laundry service requested (e.g., Washing, Dry Cleaning)
     */
    serviceType: {
      type: DataTypes.STRING(100),
      defaultValue: null
    },
    pickupDate: {
      type: DataTypes.STRING(50),
      defaultValue: null
    },
    pickupTime: {
      type: DataTypes.STRING(50),
      defaultValue: null
    },
    deliveryDate: {
      type: DataTypes.STRING(50),
      defaultValue: null
    },
    /**
     * JSON array detailing specific clothing items included in the order
     */
    items: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    /**
     * Total cost associated with the laundry order
     */
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    address: {
      type: DataTypes.STRING(500),
      defaultValue: null
    },
    phone: {
      type: DataTypes.STRING(20),
      defaultValue: null
    },
    specialInstructions: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    /**
     * Current lifecycle status of the order (e.g., pending, washing, completed)
     */
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'pending'
    },
    /**
     * Payment resolution status (e.g., pending, paid)
     */
    paymentStatus: {
      type: DataTypes.STRING(30),
      defaultValue: 'pending'
    },
    feedbackRating: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      validate: { min: 1, max: 5 }
    },
    feedbackComment: {
      type: DataTypes.TEXT,
      defaultValue: null
    },
    feedbackSubmittedAt: {
      type: DataTypes.DATE,
      defaultValue: null
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['orderNumber'], unique: true },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['userId', 'createdAt'] }
    ]
  });

  return Order;
}

/**
 * Retrieves the currently initialized Order model.
 * Throws an error if the database has not been initialized.
 *
 * @throws {Error} If the database connection is not established.
 * @returns {import('sequelize').ModelCtor<import('sequelize').Model>} The active Order model instance.
 */
function getOrderModel() {
  if (!Order) {
    const sequelize = getSequelize();
    if (sequelize) {
      return initOrder(sequelize);
    }
    throw new Error('Database not initialized.');
  }
  return Order;
}

module.exports = { initOrder, getOrderModel };
