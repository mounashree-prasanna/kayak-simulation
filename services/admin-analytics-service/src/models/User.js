// User model reference - shared collection with user-service
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
}, { _id: false });

const userSchema = new Schema({
  user_id: { type: String, required: true, unique: true, trim: true },
  first_name: { type: String, required: true, trim: true },
  last_name: { type: String, required: true, trim: true },
  address: { type: addressSchema, required: true },
  phone_number: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  profile_image_url: { type: String, trim: true },
  refresh_token: { type: String, trim: true, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'users',
  timestamps: false,
  strict: false // Allow additional fields
});

module.exports = mongoose.model('User', userSchema);

