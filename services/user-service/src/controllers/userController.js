const User = require('../models/User');
const Admin = require('../models/Admin');
const { publishUserEvent } = require('../config/kafka');
const { validateSSN, validateState, validateZip, validateEmail } = require('../utils/validation');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

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

    // First check if it's an admin
    let admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (admin) {
      // Admin login
      console.log('[User Service] Admin found, attempting admin login');
      
      if (!admin.password || typeof admin.password !== 'string' || admin.password.trim() === '') {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      const isPasswordValid = await admin.comparePassword(password);
      
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      // Generate JWT tokens for admin
      const accessToken = generateAccessToken({
        admin_id: admin.admin_id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });
      
      const refreshToken = generateRefreshToken({
        admin_id: admin.admin_id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });

      // Store refresh token in database
      admin.refresh_token = refreshToken;
      await admin.save();

      // Remove password and refresh_token from response
      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.refresh_token;

      console.log('[User Service] Admin login successful:', admin.email);
      res.status(200).json({
        success: true,
        data: {
          admin: adminObj,
          accessToken,
          refreshToken,
          role: 'admin',
          userRole: admin.role
        }
      });
      return;
    }

    // Regular user login
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

    // Check if user has a password set
    if (!user.password || typeof user.password !== 'string' || user.password.trim() === '') {
      console.log('[User Service] User has no password set');
      res.status(401).json({
        success: false,
        error: 'Account does not have a password set. Please register again or contact support.'
      });
      return;
    }

    console.log('[User Service] Comparing password...');
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

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      user_id: user.user_id,
      email: user.email,
      type: 'user'
    });
    
    const refreshToken = generateRefreshToken({
      user_id: user.user_id,
      email: user.email,
      type: 'user'
    });

    // Store refresh token in database
    user.refresh_token = refreshToken;
    await user.save();

    // Remove password and refresh_token from response
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refresh_token;

    console.log('[User Service] Login successful for user:', user.email);
    res.status(200).json({
      success: true,
      data: {
        user: userObj,
        accessToken,
        refreshToken,
        role: 'user'
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
  console.log('[User Service] createUser endpoint called');
  try {
    const { user_id, first_name, last_name, address, phone_number, email, password, profile_image_url, payment_details } = req.body;
    console.log('[User Service] Received user data for:', email);

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
    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
      return;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase letter'
      });
      return;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must contain at least one lowercase letter'
      });
      return;
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must contain at least one special character'
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
    console.log('[User Service] Publishing Kafka event...');
    await publishUserEvent('user_created', userObj);
    console.log('[User Service] Kafka event published, sending response...');

    res.status(201).json({
      success: true,
      data: userObj
    });
    console.log('[User Service] Response sent successfully');
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

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
      return;
    }

    // Check if it's an admin or user
    if (decoded.type === 'admin') {
      const admin = await Admin.findOne({ admin_id: decoded.admin_id });
      
      if (!admin) {
        res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
        return;
      }

      if (admin.refresh_token !== token) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
        return;
      }

      const accessToken = generateAccessToken({
        admin_id: admin.admin_id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.refresh_token;

      res.status(200).json({
        success: true,
        data: {
          admin: adminObj,
          accessToken,
          role: 'admin',
          userRole: admin.role
        }
      });
      return;
    }

    // Regular user refresh
    const user = await User.findOne({ user_id: decoded.user_id });
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    if (user.refresh_token !== token) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
      return;
    }

    const accessToken = generateAccessToken({
      user_id: user.user_id,
      email: user.email,
      type: 'user'
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refresh_token;

    res.status(200).json({
      success: true,
      data: {
        user: userObj,
        accessToken,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('[User Service] Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    const { user_id, admin_id } = req.body;

    // Handle admin logout
    if (admin_id) {
      const admin = await Admin.findOne({ admin_id });
      if (admin) {
        admin.refresh_token = null;
        await admin.save();
        console.log('[User Service] Admin logout successful:', admin.email);
      }
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
      return;
    }

    // Handle user logout
    if (!user_id) {
      res.status(400).json({
        success: false,
        error: 'User ID or Admin ID is required'
      });
      return;
    }

    const user = await User.findOne({ user_id });
    
    if (!user) {
      console.log('[User Service] User not found for logout:', user_id);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
      return;
    }

    user.refresh_token = null;
    await user.save();

    console.log('[User Service] Logout successful for user:', user.email);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[User Service] Logout error:', error);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
  refreshToken,
  logoutUser
};

