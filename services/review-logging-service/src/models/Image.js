const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imageSchema = new Schema({
  entity_type: {
    type: String,
    required: true,
    enum: ['Flight', 'Hotel', 'Room', 'Car']
  },
  entity_id: {
    type: String,
    required: true,
    trim: true
  },
  image_url: {
    type: String,
    required: true,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'images',
  timestamps: false
});

imageSchema.index({ entity_type: 1, entity_id: 1 });

module.exports = mongoose.model('Image', imageSchema);

