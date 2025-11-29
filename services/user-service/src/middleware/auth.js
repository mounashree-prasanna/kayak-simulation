const { verifyAccessToken } = require('../utils/jwt');
const { hasPermission } = require('../controllers/adminController');

/**
 * Middleware to verify access token
 * Adds user info to req.user or req.admin if token is valid
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Authorization header must be in format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Add user or admin info to request based on token type
    if (decoded.type === 'admin') {
      req.admin = {
        admin_id: decoded.admin_id,
        email: decoded.email,
        role: decoded.role
      };
    } else {
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

/**
 * Middleware to check admin permissions
 * @param {String} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!hasPermission(req.admin.role, permission)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${permission}`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requirePermission
};

