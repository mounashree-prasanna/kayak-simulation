const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const flightSchema = new Schema({
  flight_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  airline_name: {
    type: String,
    required: true,
    trim: true
  },
  provider_id: {
    type: String,
    trim: true,
    uppercase: true,
    index: true,
    sparse: true // Allow null values but index when present
  },
  departure_airport: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  departure_city: {
    type: String,
    trim: true
  },
  arrival_airport: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  arrival_city: {
    type: String,
    trim: true
  },
  departure_datetime: {
    type: Date,
    required: true
  },
  arrival_datetime: {
    type: Date,
    required: true
  },
  duration_minutes: {
    type: Number,
    required: true,
    min: 0
  },
  flight_class: {
    type: String,
    required: true,
    enum: ['Economy', 'Business', 'First']
  },
  ticket_price: {
    type: Number,
    required: true,
    min: 0
  },
  total_available_seats: {
    type: Number,
    required: true,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
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
  collection: 'flights',
  timestamps: false
});

flightSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Feature flag for indexing
const ENABLE_INDEXING = process.env.ENABLE_INDEXING !== 'false'; // Default: enabled

// Indexes
flightSchema.index({ flight_id: 1 }, { unique: true });

if (ENABLE_INDEXING) {
  // Single-field indexes for common queries
  flightSchema.index({ departure_airport: 1 });
  flightSchema.index({ arrival_airport: 1 });
  flightSchema.index({ departure_datetime: 1 });
  flightSchema.index({ ticket_price: 1 });
  flightSchema.index({ departure_city: 1 });
  flightSchema.index({ arrival_city: 1 });
  flightSchema.index({ rating: 1 });
  
  // Compound indexes for multi-field searches (most selective first)
  flightSchema.index({ 
    departure_airport: 1, 
    arrival_airport: 1, 
    departure_datetime: 1 
  });
  flightSchema.index({ 
    departure_airport: 1, 
    arrival_airport: 1, 
    ticket_price: 1 
  });
} else {
  // Minimal indexes when indexing is disabled
  flightSchema.index({ 
    departure_airport: 1, 
    arrival_airport: 1, 
    departure_datetime: 1 
  });
  flightSchema.index({ departure_city: 1 });
  flightSchema.index({ arrival_city: 1 });
  flightSchema.index({ departure_datetime: 1 });
  flightSchema.index({ rating: 1 });
}

module.exports = mongoose.model('Flight', flightSchema);

