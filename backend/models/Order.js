const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  type: String,        // e.g., "regular", "delicates", etc.
  count: Number,       // number of items
  quantity: Number,    // alias for count
  name: String,        // optional item name
  color: String,       // e.g., "mixed", "white", "colored"
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  orderNumber: { type: String, unique: true, index: true },
  serviceType: String,
  pickupDate: String,
  pickupTime: String,
  deliveryDate: String,
  items: [itemSchema],
  totalAmount: Number,
  address: String,
  phone: String,
  specialInstructions: String,
  status: { type: String, default: 'pending', index: true },
  paymentStatus: { type: String, default: 'pending' },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
