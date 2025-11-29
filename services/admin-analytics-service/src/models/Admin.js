const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const addressSchema = new Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
}, { _id: false });

const adminSchema = new Schema({
  admin_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: addressSchema,
    required: true
  },
  phone_number: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    required: true,
    enum: ['Super Admin', 'Listing Admin', 'User Admin', 'Billing Admin', 'Analytics Admin'],
    default: 'Analytics Admin'
  },
  reports_and_analytics_managed: {
    type: [String],
    default: []
  },
  refresh_token: {
    type: String,
    trim: true,
    default: null
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
  collection: 'admins',
  timestamps: false
});

// Pre-save middleware to hash password and update updated_at
adminSchema.pre('save', async function(next) {
  this.updated_at = new Date();
  
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password || typeof this.password !== 'string' || !candidatePassword || typeof candidatePassword !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('[Admin Model] Password comparison error:', error);
    return false;
  }
};

// Indexes
adminSchema.index({ admin_id: 1 }, { unique: true });
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ role: 1 });
adminSchema.index({ created_at: 1 });

module.exports = mongoose.model('Admin', adminSchema);

