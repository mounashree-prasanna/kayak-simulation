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
  departure_airport: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  arrival_airport: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
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

// Indexes
flightSchema.index({ flight_id: 1 }, { unique: true });
flightSchema.index({ 
  departure_airport: 1, 
  arrival_airport: 1, 
  departure_datetime: 1 
});
flightSchema.index({ departure_datetime: 1 });
flightSchema.index({ rating: 1 });

module.exports = mongoose.model('Flight', flightSchema);

