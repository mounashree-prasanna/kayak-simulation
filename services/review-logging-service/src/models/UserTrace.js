const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const traceEventSchema = new Schema({
  type: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const userTraceSchema = new Schema({
  user_id: {
    type: String,
    trim: true
  },
  cohort_key: {
    type: String,
    trim: true
  },
  events: {
    type: [traceEventSchema],
    default: []
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
  collection: 'user_traces',
  timestamps: false
});

userTraceSchema.index({ user_id: 1 });
userTraceSchema.index({ cohort_key: 1 });
userTraceSchema.index({ created_at: 1 });

module.exports = mongoose.model('UserTrace', userTraceSchema);

