const mysql = require('mysql2/promise');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'host.docker.internal',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Anvitha@2310',
  database: process.env.MYSQL_DATABASE || 'kayak_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(MYSQL_CONFIG);

// Test connection
const connectMySQL = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[Admin Analytics Service] MySQL Connected');
    connection.release();
    return true;
  } catch (error) {
    console.error('[Admin Analytics Service] MySQL connection error:', error.message);
    throw error;
  }
};

// Execute query with connection pool
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('[Admin Analytics Service] MySQL query error:', error.message);
    throw error;
  }
};

// Execute transaction
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
  query,
  executeTransaction
};
