const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-super-secret-key-change-in-production';

const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null);

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid API key required.'
    });
    return;
  }

  next();
};

module.exports = { adminAuth };

