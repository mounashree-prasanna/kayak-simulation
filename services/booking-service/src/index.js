const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database'); // MongoDB for user/listing references
const { connectMySQL } = require('./config/mysql'); // MySQL for bookings
const { initializeKafka, consumer } = require('./config/kafka');
const { startBillingEventConsumer } = require('./utils/billingEventHandler');
const { connectRedis } = require('../../../shared/redisClient');
const bookingRoutes = require('./routes/bookingRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Booking Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/bookings', bookingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Booking Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to MongoDB (for user/listing references)
    await connectDB();
    // Connect to MySQL (for bookings - ACID compliance)
    await connectMySQL();
    // Connect to Redis (for caching)
    try {
      await connectRedis();
      console.log('[Booking Service] Redis connected for caching');
    } catch (redisError) {
      console.warn('[Booking Service] Redis connection failed, continuing without cache:', redisError.message);
    }
    // Initialize Kafka (producer and consumer)
    await initializeKafka();
    // Start consuming billing events (Saga pattern)
    await startBillingEventConsumer(consumer);
    
    app.listen(PORT, () => {
      console.log(`[Booking Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Booking Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

