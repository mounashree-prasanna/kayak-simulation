const User = require('../models/User');
const { publishUserEvent } = require('../config/kafka');
const { validateSSN, validateState, validateZip, validateEmail } = require('../utils/validation');

const createUser = async (req, res) => {
  try {
    const { user_id, first_name, last_name, address, phone_number, email, profile_image_url, payment_details } = req.body;

    // Validation
    if (!validateSSN(user_id)) {
      res.status(400).json({
        success: false,
        error: 'user_id must be in SSN format: ###-##-####'
      });
      return;
    }

    if (address && !validateState(address.state)) {
      res.status(400).json({
        success: false,
        error: 'Invalid state. Must be a valid US state abbreviation or full name.'
      });
      return;
    }

    if (address && !validateZip(address.zip)) {
      res.status(400).json({
        success: false,
        error: 'Invalid zip code. Must be either ##### or #####-####'
      });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
      return;
    }

    // Check for duplicates
    const existingUserBySSN = await User.findOne({ user_id });
    if (existingUserBySSN) {
      res.status(409).json({
        success: false,
        error: 'User with this user_id (SSN) already exists'
      });
      return;
    }

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Create user
    const user = new User({
      user_id,
      first_name,
      last_name,
      address,
      phone_number,
      email,
      profile_image_url,
      payment_details,
      created_at: new Date(),
      updated_at: new Date()
    });

    const savedUser = await user.save();

    // Publish Kafka event
    await publishUserEvent('user_created', savedUser.toObject());

    res.status(201).json({
      success: true,
      data: savedUser
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(409).json({
        success: false,
        error: `User with this ${field} already exists`
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await User.findOne({ user_id });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const updates = req.body;

    // Validate SSN if provided
    if (updates.user_id && !validateSSN(updates.user_id)) {
      res.status(400).json({
        success: false,
        error: 'user_id must be in SSN format: ###-##-####'
      });
      return;
    }

    // Validate state if address is updated
    if (updates.address && updates.address.state && !validateState(updates.address.state)) {
      res.status(400).json({
        success: false,
        error: 'Invalid state. Must be a valid US state abbreviation or full name.'
      });
      return;
    }

    // Validate zip if address is updated
    if (updates.address && updates.address.zip && !validateZip(updates.address.zip)) {
      res.status(400).json({
        success: false,
        error: 'Invalid zip code. Must be either ##### or #####-####'
      });
      return;
    }

    // Validate email if provided
    if (updates.email && !validateEmail(updates.email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
      return;
    }

    updates.updated_at = new Date();

    const user = await User.findOneAndUpdate(
      { user_id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Publish Kafka event
    await publishUserEvent('user_updated', user.toObject());

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'User with this identifier already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await User.findOneAndDelete({ user_id });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Publish Kafka event
    await publishUserEvent('user_deleted', user.toObject());

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser
};

