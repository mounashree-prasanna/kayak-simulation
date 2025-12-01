const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
}, { _id: false });

const amenitiesSchema = new Schema({
  wifi: { type: Boolean, default: false },
  breakfast_included: { type: Boolean, default: false },
  parking: { type: Boolean, default: false },
  pet_friendly: { type: Boolean, default: false },
  near_transit: { type: Boolean, default: false },
  pool: { type: Boolean, default: false },
  gym: { type: Boolean, default: false }
}, { _id: false, strict: false });

const hotelSchema = new Schema({
  hotel_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: addressSchema,
    required: true
  },
  star_rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  number_of_rooms: {
    type: Number,
    required: true,
    min: 1
  },
  default_room_type: {
    type: String,
    required: true,
    trim: true
  },
  price_per_night: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: {
    type: amenitiesSchema,
    required: true,
    default: {}
  },
  hotel_rating: {
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
  collection: 'hotels',
  timestamps: false
});

hotelSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Feature flag for indexing
const ENABLE_INDEXING = process.env.ENABLE_INDEXING !== 'false'; // Default: enabled

// Indexes
hotelSchema.index({ hotel_id: 1 }, { unique: true });

if (ENABLE_INDEXING) {
  // Single-field indexes for common queries
  hotelSchema.index({ 'address.city': 1 });
  hotelSchema.index({ price_per_night: 1 });
  hotelSchema.index({ star_rating: 1 });
  hotelSchema.index({ hotel_rating: 1 });
  
  // Compound indexes for multi-field searches
  hotelSchema.index({ 'address.city': 1, price_per_night: 1 });
  hotelSchema.index({ 'address.city': 1, star_rating: 1 });
  hotelSchema.index({ 'amenities.pet_friendly': 1, 'amenities.wifi': 1 });
} else {
  // Minimal indexes when indexing is disabled
  hotelSchema.index({ 'address.city': 1, price_per_night: 1 });
  hotelSchema.index({ star_rating: 1 });
  hotelSchema.index({ hotel_rating: 1 });
  hotelSchema.index({ 'amenities.pet_friendly': 1, 'amenities.wifi': 1 });
}

module.exports = mongoose.model('Hotel', hotelSchema);

