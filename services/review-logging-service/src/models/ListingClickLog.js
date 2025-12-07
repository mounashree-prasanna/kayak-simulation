const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingClickLogSchema = new Schema({
  user_id: {
    type: String,
    required: false,
    trim: true,
    default: null
  },
  listing_type: {
    type: String,
    required: true,
    enum: ['Flight', 'Hotel', 'Car']
  },
  listing_id: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'listing_click_logs',
  timestamps: false
});

listingClickLogSchema.index({ timestamp: 1 });
listingClickLogSchema.index({ user_id: 1 });
listingClickLogSchema.index({ listing_type: 1, listing_id: 1 });

module.exports = mongoose.model('ListingClickLog', listingClickLogSchema);

