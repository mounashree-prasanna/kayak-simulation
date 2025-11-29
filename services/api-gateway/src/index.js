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
  pathRewrite: { '^/api/users': '/users' }
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
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

