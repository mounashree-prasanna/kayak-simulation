const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Availability Block Model
 * 
 * Tracks date ranges that are blocked/booked for listings.
 * This is a cache/denormalized view of bookings for fast search queries.
 * 
 * Source of truth: MySQL bookings table
 * This collection: Fast cache for search filtering
 */
const availabilityBlockSchema = new Schema({
  listing_type: {
    type: String,
    required: true,
    enum: ['Flight', 'Hotel', 'Car'],
    index: true
  },
  reference_id: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  start_date: {
    type: Date,
    required: true,
    index: true
  },
  end_date: {
    type: Date,
    required: true,
    index: true
  },
  booking_id: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  booking_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'PaymentFailed'],
    index: true
  },
  user_id: {
    type: String,
    required: true,
    trim: true
  },
  // For capacity tracking (flights/hotels)
  quantity: {
    type: Number,
    default: 1,
    min: 1
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
  collection: 'availability_blocks',
  timestamps: false
});

// Compound indexes for fast queries
availabilityBlockSchema.index({ listing_type: 1, reference_id: 1, start_date: 1, end_date: 1 });
availabilityBlockSchema.index({ listing_type: 1, reference_id: 1, booking_status: 1 });
availabilityBlockSchema.index({ start_date: 1, end_date: 1 });
availabilityBlockSchema.index({ booking_id: 1 }, { unique: true }); // One block per booking

// TTL index to auto-delete old blocks (optional - keeps collection clean)
// availabilityBlockSchema.index({ end_date: 1 }, { expireAfterSeconds: 0 }); // Uncomment if you want auto-cleanup

availabilityBlockSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('AvailabilityBlock', availabilityBlockSchema);

