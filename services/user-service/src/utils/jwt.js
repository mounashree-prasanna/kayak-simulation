const jwt = require('jsonwebtoken');

// JWT secret keys - in production, these should be in environment variables
// Support both ACCESS_TOKEN_SECRET and JWT_SECRET for backward compatibility
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'your-access-token-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'your-refresh-token-secret-key-change-in-production';

// Access token expires in 5 minutes
const ACCESS_TOKEN_EXPIRY = '5m';
// Refresh token expires in 7 days
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token (expires in 5 minutes)
 * @param {Object} payload - Token payload (user_id, admin_id, email, role, type, etc.)
 * @returns {String} Access token
 */
const generateAccessToken = (payload) => {
  // Build token payload dynamically based on what's provided
  const tokenPayload = {
    email: payload.email,
    type: payload.type || 'access' // Use provided type or default to 'access'
  };
  
  // Add user_id if present (for regular users)
  if (payload.user_id) {
    tokenPayload.user_id = payload.user_id;
  }
  
  // Add admin fields if present (for admins)
  if (payload.admin_id) {
    tokenPayload.admin_id = payload.admin_id;
  }
  
  if (payload.role) {
    tokenPayload.role = payload.role;
  }
  
  return jwt.sign(
    tokenPayload,
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token (expires in 7 days)
 * @param {Object} payload - Token payload (user_id, admin_id, email, role, type, etc.)
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
  // Build token payload dynamically based on what's provided
  const tokenPayload = {
    email: payload.email,
    type: payload.type || 'refresh' // Use provided type or default to 'refresh'
  };
  
  // Add user_id if present (for regular users)
  if (payload.user_id) {
    tokenPayload.user_id = payload.user_id;
  }
  
  // Add admin fields if present (for admins)
  if (payload.admin_id) {
    tokenPayload.admin_id = payload.admin_id;
  }
  
  if (payload.role) {
    tokenPayload.role = payload.role;
  }
  
  return jwt.sign(
    tokenPayload,
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Verify access token
 * @param {String} token - Access token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET
};

