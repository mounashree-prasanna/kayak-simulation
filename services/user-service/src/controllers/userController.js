const User = require('../models/User');
const { publishUserEvent } = require('../config/kafka');
const { validateSSN, validateState, validateZip, validateEmail } = require('../utils/validation');

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[User Service] Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('[User Service] Missing email or password');
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
      return;
    }

    // Find user by email and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log('[User Service] User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('[User Service] User not found for email:', email);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Check if user has a password set (for users created before password support)
    if (!user.password || typeof user.password !== 'string' || user.password.trim() === '') {
      console.log('[User Service] User has no password set');
      res.status(401).json({
        success: false,
        error: 'Account does not have a password set. Please register again or contact support.'
      });
      return;
    }

    console.log('[User Service] Comparing password...');
    // Compare password - this method has internal error handling
    const isPasswordValid = await user.comparePassword(password);
    console.log('[User Service] Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[User Service] Invalid password');
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    console.log('[User Service] Login successful for user:', user.email);
    // Return user data (token would be generated here in production with JWT)
    res.status(200).json({
      success: true,
      data: {
        user: userObj,
        token: user.user_id // Using user_id as token for now (in production, use JWT)
      }
    });
  } catch (error) {
    console.error('[User Service] Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { user_id, first_name, last_name, address, phone_number, email, password, profile_image_url, payment_details } = req.body;

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

    // Validate password
    if (!password || password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password is required and must be at least 6 characters long'
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
      password,
      profile_image_url,
      payment_details,
      created_at: new Date(),
      updated_at: new Date()
    });

    const savedUser = await user.save();

    // Remove password from user object before sending response
    const userObj = savedUser.toObject();
    delete userObj.password;

    // Publish Kafka event
    await publishUserEvent('user_created', userObj);

    res.status(201).json({
      success: true,
      data: userObj
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
  loginUser,
  getUser,
  updateUser,
  deleteUser
};

