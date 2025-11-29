const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const addressSchema = new Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
}, { _id: false });

const paymentDetailsSchema = new Schema({
  card_token: { type: String },
  masked_number: { type: String },
  card_type: { type: String, required: true },
  expiry_month: { type: Number, required: true, min: 1, max: 12 },
  expiry_year: { type: Number, required: true, min: 2020 },
}, { _id: false });

const userSchema = new Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // SSN format: ###-##-####
        return /^\d{3}-\d{2}-\d{4}$/.test(v);
      },
      message: 'user_id must be in SSN format: ###-##-####'
    }
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
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  profile_image_url: {
    type: String,
    trim: true
  },
  payment_details: {
    type: paymentDetailsSchema
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
  collection: 'users',
  timestamps: false
});

// Pre-save middleware to hash password and update updated_at
userSchema.pre('save', async function(next) {
  // Update updated_at
  this.updated_at = new Date();
  
  // Hash password if it's been modified
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Check if password exists and is a string
  if (!this.password || typeof this.password !== 'string' || !candidatePassword || typeof candidatePassword !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('[User Model] Password comparison error:', error);
    return false;
  }
};

// Indexes
userSchema.index({ user_id: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ created_at: 1 });

module.exports = mongoose.model('User', userSchema);

