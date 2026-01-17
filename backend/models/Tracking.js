const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: String,
  timestamp: { type: Date, default: Date.now },
  note: String,
}, { _id: false });

const trackingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: { type: String, index: true },
  status: { type: String, default: 'pending' },
  currentLocation: String,
  estimatedDelivery: String,
  timeline: [timelineSchema],
}, { timestamps: true });

module.exports = mongoose.model('Tracking', trackingSchema);
