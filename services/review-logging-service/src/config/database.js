const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak_db';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[Review & Logging Service] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Review & Logging Service] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

