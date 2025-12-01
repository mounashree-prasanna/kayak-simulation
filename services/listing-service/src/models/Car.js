const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const carSchema = new Schema({
  car_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  car_type: {
    type: String,
    required: true,
    trim: true
  },
  provider_name: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  transmission_type: {
    type: String,
    required: true,
    trim: true
  },
  number_of_seats: {
    type: Number,
    required: true,
    min: 1
  },
  daily_rental_price: {
    type: Number,
    required: true,
    min: 0
  },
  car_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  availability_status: {
    type: String,
    required: true,
    enum: ['Available', 'Booked', 'Maintenance', 'Unavailable'],
    default: 'Available'
  },
  pickup_city: {
    type: String,
    required: true,
    trim: true
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
  collection: 'cars',
  timestamps: false
});

carSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Feature flag for indexing
const ENABLE_INDEXING = process.env.ENABLE_INDEXING !== 'false'; // Default: enabled

// Indexes
carSchema.index({ car_id: 1 }, { unique: true });

if (ENABLE_INDEXING) {
  // Single-field indexes for common queries
  carSchema.index({ pickup_city: 1 });
  carSchema.index({ 'location.pickup.city': 1 }); // Support nested location field if used
  carSchema.index({ price_per_day: 1 }); // Alternative field name
  carSchema.index({ daily_rental_price: 1 });
  carSchema.index({ availability_status: 1 });
  carSchema.index({ car_rating: 1 });
  
  // Compound indexes for multi-field searches
  carSchema.index({ pickup_city: 1, daily_rental_price: 1, car_type: 1 });
  carSchema.index({ 'location.pickup.city': 1, daily_rental_price: 1 }); // If location structure is used
} else {
  // Minimal indexes when indexing is disabled
  carSchema.index({ pickup_city: 1, daily_rental_price: 1, car_type: 1 });
  carSchema.index({ availability_status: 1 });
  carSchema.index({ car_rating: 1 });
}

module.exports = mongoose.model('Car', carSchema);

