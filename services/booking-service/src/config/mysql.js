const mysql = require('mysql2/promise');

// MySQL connection pool configuration for ACID compliance
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'kayak_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
const connectMySQL = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`[Booking Service] MySQL Connected: ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}/${process.env.MYSQL_DATABASE || 'kayak_db'}`);
    return pool;
  } catch (error) {
    console.error(`[Booking Service] MySQL connection error: ${error.message}`);
    throw error;
  }
};

// Get a connection from the pool (for transactions)
const getConnection = async () => {
  return await pool.getConnection();
};

// Execute a query with automatic connection management
const query = async (sql, params) => {
  try {
    const [results, fields] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('[Booking Service] MySQL query error:', error);
    throw error;
  }
};

// Execute a transaction (ACID compliance)
const executeTransaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  connectMySQL,
  getConnection,
  query,
  executeTransaction
};

