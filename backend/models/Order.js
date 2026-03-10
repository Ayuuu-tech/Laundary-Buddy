const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  type: { type: String, default: 'unknown' },  // e.g., "regular", "delicates", etc.
  count: { type: Number, default: 0 },          // number of items
  color: { type: String, default: 'mixed' },    // e.g., "mixed", "white", "colored"
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  orderNumber: { type: String, unique: true, index: true },
  serviceType: String,
  pickupDate: Date,
  pickupTime: String,
  deliveryDate: Date,
  items: [itemSchema],
  totalAmount: Number,
  address: String,
  phone: String,
  specialInstructions: String,
  status: {
    type: String,
    default: 'pending',
    index: true,
    enum: [
      'pending',       // Initial state
      'submitted',     // Order submitted by user
      'confirmed',     // Order confirmed by staff
      'received',      // Laundry received at facility
      'washing',       // Currently being washed
      'drying',        // Currently being dried
      'folding',       // Currently being folded
      'ready',         // Ready for pickup (alias)
      'ready-for-pickup', // Ready for pickup
      'picked-up',     // Picked up by user
      'in-progress',   // General in-progress state
      'out-for-delivery', // Out for delivery
      'delivered',     // Delivered to user
      'completed',     // Order fully completed
      'cancelled'      // Order cancelled
    ]
  },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'refunded'] },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  }
}, { timestamps: true });

// Indexes for performance
orderSchema.index({ createdAt: -1 }); // For Admin Dashboard sorting
orderSchema.index({ user: 1, createdAt: -1 }); // For User Order History sorting

module.exports = mongoose.model('Order', orderSchema);
