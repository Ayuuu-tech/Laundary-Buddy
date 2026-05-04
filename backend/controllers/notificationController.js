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

const webpush = require('web-push');
const { getSubscriptionModel } = require('../models/Subscription');
const logger = require('../middleware/logger').logger;

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@laundrybuddy.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('VAPID keys not found. Push notifications will not work.');
}

// Subscribe to push notifications
exports.subscribe = async (req, res) => {
  try {
    const Subscription = getSubscriptionModel();
    const subscription = req.body;

    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    // Upsert based on endpoint
    const existing = await Subscription.findOne({ where: { endpoint: subscription.endpoint } });
    if (existing) {
      await existing.update({
        userId: req.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent']
      });
    } else {
      await Subscription.create({
        userId: req.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    logger.error('Error in subscribe:', error);
    res.status(500).json({ success: false, message: 'Subscription failed' });
  }
};

// Send notification to a specific user
exports.sendNotificationToUser = async (userId, payload) => {
  try {
    const Subscription = getSubscriptionModel();
    const subscriptions = await Subscription.findAll({ where: { userId } });

    if (subscriptions.length === 0) {
      return { success: false, message: 'No subscriptions found' };
    }

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map(async (sub) => {
      try {
        // Reconstruct the subscription object for web-push
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, payloadString);
        return { success: true };
      } catch (error) {
        // Check for 410 Gone (expired) and delete
        if (error.statusCode === 410 || error.statusCode === 404) {
          await Subscription.destroy({ where: { id: sub.id } });
        }
        logger.warn(`Failed to send push to sub ${sub.id}: ${error.message}`);
        return { success: false, error };
      }
    });

    await Promise.all(promises);
    return { success: true, count: subscriptions.length };
  } catch (error) {
    logger.error('Error sending notification:', error);
    return { success: false, error };
  }
};

// Get VAPID Public Key (Frontend needs this)
exports.getVapidPublicKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY });
};
