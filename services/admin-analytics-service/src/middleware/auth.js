const { verifyAccessToken } = require('../utils/jwt');
const { hasPermission } = require('../controllers/adminController');

const authenticate = async (req, res, next) => {
  try {
    console.log('[Auth Middleware] Request received:', req.method, req.path);
    console.log('[Auth Middleware] Headers:', {
      authorization: req.headers.authorization ? 'Bearer ***' : 'missing',
      'content-type': req.headers['content-type']
    });
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth Middleware] No valid authorization header');
      return res.status(401).json({
        success: false,
        error: 'No token provided. Authorization header must be in format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('[Auth Middleware] Token missing after Bearer');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
      console.log('[Auth Middleware] Token decoded successfully:', {
        admin_id: decoded.admin_id,
        type: decoded.type,
        role: decoded.role,
        email: decoded.email
      });
    } catch (error) {
      console.error('[Auth Middleware] Token verification failed:', error.message);

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please log in again.',
        details: error.message
      });
    }
    
    const isAdmin = decoded.type === 'admin' || 
                    decoded.admin_id || 
                    (decoded.role && (decoded.role === 'admin' || decoded.role.includes('Admin')));
    
    console.log('[Auth Middleware] Admin check:', {
      isAdmin,
      type: decoded.type,
      admin_id: decoded.admin_id,
      role: decoded.role
    });
    
    if (!isAdmin) {
      console.warn('[Auth Middleware] Access denied - not an admin token');
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        details: 'Token does not contain admin credentials'
      });
    }

    // Add admin info to request
    req.admin = {
      admin_id: decoded.admin_id,
      email: decoded.email,
      role: decoded.role || decoded.userRole || 'Admin' // Support both role and userRole
    };

    console.log('[Auth Middleware] Admin info set:', {
      admin_id: req.admin.admin_id,
      email: req.admin.email,
      role: req.admin.role
    });

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid or expired token'
    });
  }
};

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
 * @param {String} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    console.log('[RequirePermission] Checking permission:', {
      permission,
      adminRole: req.admin?.role,
      admin_id: req.admin?.admin_id
    });
    
    if (!req.admin) {
      console.log('[RequirePermission] No admin object in request');
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const hasAccess = hasPermission(req.admin.role, permission);
    console.log('[RequirePermission] Permission check result:', {
      hasAccess,
      adminRole: req.admin.role,
      requiredPermission: permission
    });

    if (!hasAccess) {
      console.warn('[RequirePermission] Access denied:', {
        adminRole: req.admin.role,
        requiredPermission: permission
      });
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required: ${permission}`,
        details: `Your role (${req.admin.role}) does not have the required permission (${permission})`
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

