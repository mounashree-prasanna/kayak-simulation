const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const providerSchema = new Schema({
  provider_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  provider_name: {
    type: String,
    required: true,
    trim: true
  },
  provider_type: {
    type: String,
    required: true,
    enum: ['flight', 'hotel', 'car'],
    lowercase: true
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
  collection: 'providers',
  timestamps: false
});

providerSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes
providerSchema.index({ provider_id: 1 }, { unique: true });
providerSchema.index({ provider_type: 1 });
providerSchema.index({ provider_name: 1 });

module.exports = mongoose.model('Provider', providerSchema);
