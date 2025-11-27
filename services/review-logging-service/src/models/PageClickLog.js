const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pageClickLogSchema = new Schema({
  user_id: {
    type: String,
    trim: true
  },
  page: {
    type: String,
    required: true,
    trim: true
  },
  element_id: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'page_click_logs',
  timestamps: false
});

pageClickLogSchema.index({ timestamp: 1 });
pageClickLogSchema.index({ user_id: 1 });
pageClickLogSchema.index({ page: 1 });

module.exports = mongoose.model('PageClickLog', pageClickLogSchema);

