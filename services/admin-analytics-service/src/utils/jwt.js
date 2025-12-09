const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'your-access-token-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'your-refresh-token-secret-key-change-in-production';

const ACCESS_TOKEN_EXPIRY = '5m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * @param {Object} payload - Token payload (admin_id, email, role, etc.)
 * @returns {String} Access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      admin_id: payload.admin_id,
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      type: payload.type || 'access'
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * @param {Object} payload - Token payload (admin_id, email, role, etc.)
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      admin_id: payload.admin_id,
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      type: payload.type || 'refresh'
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
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

