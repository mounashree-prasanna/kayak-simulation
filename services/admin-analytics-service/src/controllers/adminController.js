const Admin = require('../models/Admin');
const User = require('../models/User');
const { validateState, validateZip, validateEmail } = require('../utils/validation');

// Role-based permission check
const hasPermission = (adminRole, requiredPermission) => {
  const permissions = {
    'Super Admin': ['all', 'create_admin', 'manage_listings', 'manage_users', 'view_billing', 'view_analytics'],
    'Listing Admin': ['manage_listings'],
    'User Admin': ['manage_users'],
    'Billing Admin': ['view_billing'],
    'Analytics Admin': ['view_analytics']
  };

  const adminPermissions = permissions[adminRole] || [];
  return adminPermissions.includes('all') || adminPermissions.includes(requiredPermission);
};

const createAdmin = async (req, res) => {
  try {
    const { admin_id, first_name, last_name, address, phone_number, email, password, role, reports_and_analytics_managed } = req.body;

    if (!admin_id || !first_name || !last_name || !address || !phone_number || !email || !password || !role) {
      res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
      return;
    }

    // Validate state and zip
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

    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must contain uppercase, lowercase, and special characters'
      });
      return;
    }

    // Validate role
    const validRoles = ['Super Admin', 'Listing Admin', 'User Admin', 'Billing Admin', 'Analytics Admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
      return;
    }

    // Check for duplicates
    const existingAdminByID = await Admin.findOne({ admin_id: admin_id.toUpperCase() });
    if (existingAdminByID) {
      res.status(409).json({
        success: false,
        error: 'Admin with this admin_id already exists'
      });
      return;
    }

    const existingAdminByEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdminByEmail) {
      res.status(409).json({
        success: false,
        error: 'Admin with this email already exists'
      });
      return;
    }

    // Create admin
    const admin = new Admin({
      admin_id: admin_id.toUpperCase(),
      first_name,
      last_name,
      address,
      phone_number,
      email: email.toLowerCase(),
      password,
      role,
      reports_and_analytics_managed: reports_and_analytics_managed || []
    });

    await admin.save();

    // Remove password from response
    const adminObj = admin.toObject();
    delete adminObj.password;
    delete adminObj.refresh_token;

    console.log('[Admin Analytics Service] Admin created:', admin.email);
    res.status(201).json({
      success: true,
      data: adminObj
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Admin with this identifier already exists'
      });
      return;
    }

    console.error('[Admin Analytics Service] Create admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create admin'
    });
  }
};

// Get all admins (only Super Admin)
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password -refresh_token').sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error('[Admin Analytics Service] Get admins error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch admins'
    });
  }
};

// Get admin by ID
const getAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    const admin = await Admin.findOne({ admin_id: admin_id.toUpperCase() }).select('-password -refresh_token');

    if (!admin) {
      res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('[Admin Analytics Service] Get admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch admin'
    });
  }
};

// Update admin
const updateAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;
    const updates = req.body;

    // Don't allow updating password through this endpoint
    delete updates.password;
    delete updates.refresh_token;

    // Validate email if provided
    if (updates.email && !validateEmail(updates.email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
      return;
    }

    // Validate state and zip if address is provided
    if (updates.address) {
      if (updates.address.state && !validateState(updates.address.state)) {
        res.status(400).json({
          success: false,
          error: 'Invalid state. Must be a valid US state abbreviation or full name.'
        });
        return;
      }

      if (updates.address.zip && !validateZip(updates.address.zip)) {
        res.status(400).json({
          success: false,
          error: 'Invalid zip code. Must be either ##### or #####-####'
        });
        return;
      }
    }

    updates.updated_at = new Date();

    const admin = await Admin.findOneAndUpdate(
      { admin_id: admin_id.toUpperCase() },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refresh_token');

    if (!admin) {
      res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
      return;
    }

    console.log('[Admin Analytics Service] Admin updated:', admin.email);
    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Admin with this identifier already exists'
      });
      return;
    }

    console.error('[Admin Analytics Service] Update admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update admin'
    });
  }
};

// Delete admin (only Super Admin)
const deleteAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    const admin = await Admin.findOneAndDelete({ admin_id: admin_id.toUpperCase() });

    if (!admin) {
      res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
      return;
    }

    console.log('[Admin Analytics Service] Admin deleted:', admin.email);
    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('[Admin Analytics Service] Delete admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete admin'
    });
  }
};

// Get all users (User Admin and Super Admin)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { user_id: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -refresh_token')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      limit: Number(limit),
      data: users
    });
  } catch (error) {
    console.error('[Admin Analytics Service] Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users'
    });
  }
};

// Update user (User Admin and Super Admin)
const updateUserByAdmin = async (req, res) => {
  try {
    const { user_id } = req.params;
    const updates = req.body;

    // Don't allow updating password through this endpoint
    delete updates.password;
    delete updates.refresh_token;

    updates.updated_at = new Date();

    const user = await User.findOneAndUpdate(
      { user_id },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refresh_token');

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    console.log('[Admin Analytics Service] User updated:', user.email);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[Admin Analytics Service] Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user'
    });
  }
};

module.exports = {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  updateUserByAdmin,
  hasPermission
};

