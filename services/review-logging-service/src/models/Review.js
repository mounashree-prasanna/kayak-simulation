const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
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
  entity_type: {
    type: String,
    required: true,
    enum: ['Flight', 'Hotel', 'Car']
  },
  entity_id: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'reviews',
  timestamps: false
});

// Indexes
reviewSchema.index({ entity_type: 1, entity_id: 1 });
reviewSchema.index({ user_id: 1 });
reviewSchema.index({ created_at: -1 });

module.exports = mongoose.model('Review', reviewSchema);

