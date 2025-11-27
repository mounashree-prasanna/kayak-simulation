const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const flightRoutes = require('./routes/flightRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const carRoutes = require('./routes/carRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Listing Service is running',
    timestamp: new Date().toISOString()
  });
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
    
    app.listen(PORT, () => {
      console.log(`[Listing Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[Listing Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

