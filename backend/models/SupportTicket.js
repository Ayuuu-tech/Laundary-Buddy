const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },
  type: { type: String, required: true, enum: ['missing-clothes', 'damage', 'contact'] },
  items: { type: String, required: true },
  damageType: { type: String },
  details: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'investigating', 'resolved', 'closed'], index: true },
  response: { type: String },
  resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
