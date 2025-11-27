const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { initializeKafka } = require('./config/kafka');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User Service is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[User Service] Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize services
const startServer = async () => {
  try {
    await connectDB();
    await initializeKafka();
    
    app.listen(PORT, () => {
      console.log(`[User Service] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[User Service] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

