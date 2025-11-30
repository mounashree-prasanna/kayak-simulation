const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  booking_id: {
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
    required: true,
    enum: ['Flight', 'Hotel', 'Car']
  },
  reference_id: {
    type: String,
    required: true,
    trim: true
  },
  reference_ref: {
    type: Schema.Types.ObjectId,
    refPath: 'booking_type'
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  booking_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'PaymentFailed'],
    default: 'Pending'
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
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
  collection: 'bookings',
  timestamps: false
});

bookingSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes
bookingSchema.index({ booking_id: 1 }, { unique: true });
bookingSchema.index({ user_id: 1, booking_type: 1, booking_status: 1 });
bookingSchema.index({ booking_type: 1, reference_id: 1 });
bookingSchema.index({ booking_status: 1 });
bookingSchema.index({ created_at: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

