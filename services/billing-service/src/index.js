const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database'); // MongoDB for user references
const { connectMySQL } = require('./config/mysql'); // MySQL for billings
const { initializeKafka } = require('./config/kafka');
const { connectRedis } = require('../../../shared/redisClient');
const billingRoutes = require('./routes/billingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Billing Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/billing', billingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Billing Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to MongoDB (for user references)
    await connectDB();
    // Connect to MySQL (for billings - ACID compliance)
    await connectMySQL();
    // Connect to Redis (for caching)
    try {
      await connectRedis();
      console.log('[Billing Service] Redis connected for caching');
    } catch (redisError) {
      console.warn('[Billing Service] Redis connection failed, continuing without cache:', redisError.message);
    }
    await initializeKafka();
    
    app.listen(PORT, () => {
      console.log(`[Billing Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Billing Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

