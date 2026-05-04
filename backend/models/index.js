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

// Model initializer - sets up all models and associations
const { initUser } = require('./User');
const { initRefreshToken } = require('./RefreshToken');
const { initOrder } = require('./Order');
const { initTracking } = require('./Tracking');
const { initContactMessage } = require('./ContactMessage');
const { initSecurityLog } = require('./SecurityLog');
const { initSubscription } = require('./Subscription');
const { initSupportTicket } = require('./SupportTicket');
const { initActivityLog } = require('./ActivityLog');

function initModels(sequelize) {
  const User = initUser(sequelize);
  const RefreshToken = initRefreshToken(sequelize);
  const Order = initOrder(sequelize);
  const Tracking = initTracking(sequelize);
  const ContactMessage = initContactMessage(sequelize);
  const SecurityLog = initSecurityLog(sequelize);
  const Subscription = initSubscription(sequelize);
  const SupportTicket = initSupportTicket(sequelize);
  const ActivityLog = initActivityLog(sequelize);

  // Set up associations
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'CASCADE' });
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Tracking, { foreignKey: 'userId', as: 'trackings', onDelete: 'CASCADE' });
  Tracking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Order.hasOne(Tracking, { foreignKey: 'orderId', as: 'tracking' });
  Tracking.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  User.hasMany(ContactMessage, { foreignKey: 'userId', as: 'contactMessages' });
  ContactMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ContactMessage.belongsTo(User, { foreignKey: 'respondedById', as: 'respondedBy' });

  User.hasMany(SecurityLog, { foreignKey: 'userId', as: 'securityLogs' });
  SecurityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions', onDelete: 'CASCADE' });
  Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets', onDelete: 'CASCADE' });
  SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Order.hasMany(SupportTicket, { foreignKey: 'orderId', as: 'supportTickets' });
  SupportTicket.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs' });
  ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  return { User, RefreshToken, Order, Tracking, ContactMessage, SecurityLog, Subscription, SupportTicket, ActivityLog };
}

module.exports = { initModels };
