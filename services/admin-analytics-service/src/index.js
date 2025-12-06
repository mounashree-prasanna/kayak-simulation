const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { connectMySQL } = require('./config/mysql');
const { connectRedis } = require('./config/redis');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin Analytics Service is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check token (temporary - remove in production)
app.get('/debug/token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const { verifyAccessToken } = require('./utils/jwt');
  
  try {
    const decoded = verifyAccessToken(token);
    res.status(200).json({
      success: true,
      decoded: {
        admin_id: decoded.admin_id,
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        userRole: decoded.userRole,
        type: decoded.type,
        iat: decoded.iat,
        exp: decoded.exp
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Routes
app.use('/analytics', analyticsRoutes);
app.use('/admins', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Admin Analytics Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    await connectDB();
    
    // Connect to MySQL (for billing data)
    try {
      await connectMySQL();
    } catch (mysqlError) {
      console.warn('[Admin Analytics Service] MySQL connection failed, billing analytics may not work:', mysqlError.message);
    }
    
    // Initialize Redis (graceful failure if not available)
    try {
      await connectRedis();
      console.log('[Admin Analytics Service] Redis connected for caching');
    } catch (redisError) {
      console.warn('[Admin Analytics Service] Redis connection failed, continuing without cache:', redisError.message);
    }
    
    app.listen(PORT, () => {
      console.log(`[Admin Analytics Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Admin Analytics Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

