const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initializeKafka } = require('./config/kafka');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const LISTING_SERVICE_URL = process.env.LISTING_SERVICE_URL || 'http://localhost:3002';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const REVIEW_LOGGING_SERVICE_URL = process.env.REVIEW_LOGGING_SERVICE_URL || 'http://localhost:3005';
const ADMIN_ANALYTICS_SERVICE_URL = process.env.ADMIN_ANALYTICS_SERVICE_URL || 'http://localhost:3006';

// Middleware
app.use(cors());

// Request logging middleware (before proxy routes)
app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
    services: {
      user: USER_SERVICE_URL,
      listing: LISTING_SERVICE_URL,
      booking: BOOKING_SERVICE_URL,
      billing: BILLING_SERVICE_URL,
      review_logging: REVIEW_LOGGING_SERVICE_URL,
      admin_analytics: ADMIN_ANALYTICS_SERVICE_URL
    }
  });
});

// Proxy routes
app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl || req.url} to ${USER_SERVICE_URL}${req.url.replace('/api/users', '/users')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[API Gateway] Received ${proxyRes.statusCode} from user service for ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error for ${req.path}:`, err.message, err.code);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to connect to user service: ' + err.message
      });
    }
  },
  timeout: 30000,
  proxyTimeout: 30000
}));

app.use('/api/flights', createProxyMiddleware({
  target: LISTING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/flights': '/flights' }
}));

app.use('/api/hotels', createProxyMiddleware({
  target: LISTING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/hotels': '/hotels' }
}));

app.use('/api/images', createProxyMiddleware({
  target: REVIEW_LOGGING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/images': '/images' }
}));

app.use('/api/cars', createProxyMiddleware({
  target: LISTING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/cars': '/cars' }
}));

app.use('/api/bookings', createProxyMiddleware({
  target: BOOKING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/bookings': '/bookings' }
}));

app.use('/api/billing', createProxyMiddleware({
  target: BILLING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/billing': '/billing' }
}));

app.use('/api/reviews', createProxyMiddleware({
  target: REVIEW_LOGGING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/reviews': '/reviews' }
}));

app.use('/api/logs', createProxyMiddleware({
  target: REVIEW_LOGGING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/logs': '/logs' }
}));

app.use('/api/analytics', createProxyMiddleware({
  target: ADMIN_ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '/analytics' }
}));

app.use('/api/admins', createProxyMiddleware({
  target: ADMIN_ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/admins': '/admins' },
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl || req.url} to ${ADMIN_ANALYTICS_SERVICE_URL}${req.url.replace('/api/admins', '/admins')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[API Gateway] Received ${proxyRes.statusCode} from admin analytics service for ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error for ${req.path}:`, err.message, err.code);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to connect to admin analytics service: ' + err.message
      });
    }
  },
  timeout: 30000,
  proxyTimeout: 30000
}));

// 404 handler
app.use((req, res) => {
  console.log(`[API Gateway] 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API Gateway] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    await initializeKafka();
    
    app.listen(PORT, () => {
      console.log(`[API Gateway] Server running on port ${PORT}`);
      console.log(`[API Gateway] Proxying to services:`);
      console.log(`  - Users: ${USER_SERVICE_URL}`);
      console.log(`  - Listings: ${LISTING_SERVICE_URL}`);
      console.log(`  - Bookings: ${BOOKING_SERVICE_URL}`);
      console.log(`  - Billing: ${BILLING_SERVICE_URL}`);
      console.log(`  - Reviews/Logs: ${REVIEW_LOGGING_SERVICE_URL}`);
      console.log(`  - Analytics: ${ADMIN_ANALYTICS_SERVICE_URL}`);
    });
  } catch (error) {
    console.error(`[API Gateway] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

