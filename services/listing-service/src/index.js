const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const flightRoutes = require('./routes/flightRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const carRoutes = require('./routes/carRoutes');
const { initializeConsumer, stopConsumer } = require('./utils/bookingEventListener');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Listing Service is running',
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[Listing Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/flights', flightRoutes);
app.use('/hotels', hotelRoutes);
app.use('/cars', carRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Listing Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    await connectDB();
    console.log('[Listing Service] MongoDB connected');
    
    // Initialize Redis (graceful failure if not available)
    try {
      await connectRedis();
      console.log('[Listing Service] Redis connected for caching');
    } catch (redisError) {
      console.warn('[Listing Service] Redis connection failed, continuing without cache:', redisError.message);
    }
    
    // Initialize Kafka consumer for availability sync (non-blocking)
    initializeConsumer().catch(err => {
      console.warn('[Listing Service] Kafka consumer initialization failed, continuing without real-time sync:', err.message);
    });
    
    app.listen(PORT, () => {
      console.log(`[Listing Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Listing Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Listing Service] SIGTERM received, shutting down gracefully...');
  await stopConsumer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Listing Service] SIGINT received, shutting down gracefully...');
  await stopConsumer();
  process.exit(0);
});

startServer();

