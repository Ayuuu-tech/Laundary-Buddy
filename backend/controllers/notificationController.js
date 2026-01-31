const webpush = require('web-push');
const Subscription = require('../models/Subscription');
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
        const subscription = req.body;

        // Validate subscription object
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object' });
        }

        // Save/Update subscription
        // Upsert based on endpoint
        await Subscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                user: req.user.id,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userAgent: req.headers['user-agent']
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        logger.error('Error in subscribe:', error);
        res.status(500).json({ success: false, message: 'Subscription failed' });
    }
};

// Send notification to a specific user
exports.sendNotificationToUser = async (userId, payload) => {
    try {
        const subscriptions = await Subscription.find({ user: userId });

        if (subscriptions.length === 0) {
            return { success: false, message: 'No subscriptions found' };
        }

        const payloadString = JSON.stringify(payload);

        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(sub, payloadString);
                return { success: true };
            } catch (error) {
                // Check for 410 Gone (expired) and delete
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await Subscription.deleteOne({ _id: sub._id });
                }
                logger.warn(`Failed to send push to sub ${sub._id}: ${error.message}`);
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
