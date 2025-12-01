const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

// Feature flag for connection pooling
const ENABLE_POOLING = process.env.ENABLE_POOLING !== 'false'; // Default: enabled

const connectDB = async () => {
  try {
    const options = {
      // Connection pool options (Mongoose uses connection pooling by default)
      maxPoolSize: ENABLE_POOLING ? parseInt(process.env.MONGODB_POOL_SIZE || '10') : 1,
      minPoolSize: ENABLE_POOLING ? parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2') : 1,
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`[Admin Analytics Service] MongoDB Connected: ${conn.connection.host}`);
    if (ENABLE_POOLING) {
      console.log(`[Admin Analytics Service] Connection pooling enabled (max: ${options.maxPoolSize}, min: ${options.minPoolSize})`);
    }
  } catch (error) {
    console.error(`[Admin Analytics Service] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

