const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billingSchema = new Schema({
  billing_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  user_id: {
    type: String,
    required: true,
    trim: true
  },
  user_ref: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking_type: {
    type: String,
    required: true
  },
  booking_id: {
    type: String,
    required: true,
    trim: true
  },
  booking_ref: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  transaction_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  total_amount_paid: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    required: true,
    trim: true
  },
  transaction_status: {
    type: String,
    required: true,
    enum: ['Success', 'Failed', 'Refunded', 'Pending'],
    default: 'Pending'
  },
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  invoice_details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'billings',
  timestamps: false
});

billingSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes
billingSchema.index({ billing_id: 1 }, { unique: true });
billingSchema.index({ transaction_date: 1 });
billingSchema.index({ user_id: 1 });
billingSchema.index({ transaction_status: 1 });
billingSchema.index({ booking_id: 1, booking_type: 1 });
billingSchema.index({ invoice_number: 1 }, { unique: true });

module.exports = mongoose.model('Billing', billingSchema);

