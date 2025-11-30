#!/usr/bin/env node

/**
 * MySQL Save Debugging Script
 * 
 * This script helps debug why booking and billing data is not being saved to MySQL.
 * It checks:
 * - MySQL connection
 * - Database and table existence
 * - Table schemas
 * - Recent data
 * - Connection configuration
 */

const mysql = require('mysql2/promise');

// Configuration - matches docker-compose.yml
const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3307, // Note: 3307 is the mapped port
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Meera@2632',
  database: process.env.MYSQL_DATABASE || 'kayak_db'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testConnection() {
  logSection('1. Testing MySQL Connection');
  
  try {
    logInfo(`Connecting to MySQL at ${config.host}:${config.port}...`);
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    
    await connection.ping();
    logSuccess('MySQL connection successful!');
    await connection.end();
    return true;
  } catch (error) {
    logError(`MySQL connection failed: ${error.message}`);
    logWarning('Make sure MySQL container is running: docker ps | grep mysql');
    logWarning(`Verify connection details: ${config.host}:${config.port}`);
    return false;
  }
}

async function checkDatabase() {
  logSection('2. Checking Database');
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    
    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === config.database);
    
    if (dbExists) {
      logSuccess(`Database '${config.database}' exists`);
      await connection.query(`USE ${config.database}`);
      
      // Check tables
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      logInfo(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
      
      const bookingsExists = tableNames.includes('bookings');
      const billingsExists = tableNames.includes('billings');
      
      if (bookingsExists) {
        logSuccess("Table 'bookings' exists");
      } else {
        logError("Table 'bookings' does NOT exist!");
        logWarning("Run: docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql");
      }
      
      if (billingsExists) {
        logSuccess("Table 'billings' exists");
      } else {
        logError("Table 'billings' does NOT exist!");
        logWarning("Run: docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql");
      }
      
      await connection.end();
      return { bookingsExists, billingsExists, tableNames };
    } else {
      logError(`Database '${config.database}' does NOT exist!`);
      logWarning("Run: docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql");
      await connection.end();
      return { bookingsExists: false, billingsExists: false, tableNames: [] };
    }
  } catch (error) {
    logError(`Error checking database: ${error.message}`);
    return { bookingsExists: false, billingsExists: false, tableNames: [] };
  }
}

async function checkTableSchemas() {
  logSection('3. Checking Table Schemas');
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    // Check bookings table structure
    try {
      const [bookingsColumns] = await connection.query('DESCRIBE bookings');
      logSuccess('Bookings table structure:');
      console.table(bookingsColumns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));
    } catch (error) {
      logError(`Could not describe bookings table: ${error.message}`);
    }
    
    // Check billings table structure
    try {
      const [billingsColumns] = await connection.query('DESCRIBE billings');
      logSuccess('Billings table structure:');
      console.table(billingsColumns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));
    } catch (error) {
      logError(`Could not describe billings table: ${error.message}`);
    }
    
    await connection.end();
  } catch (error) {
    logError(`Error checking table schemas: ${error.message}`);
  }
}

async function checkRecentData() {
  logSection('4. Checking Recent Data');
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    // Check bookings count
    try {
      const [bookingCount] = await connection.query('SELECT COUNT(*) as count FROM bookings');
      logInfo(`Total bookings: ${bookingCount[0].count}`);
      
      if (bookingCount[0].count > 0) {
        const [recentBookings] = await connection.query(
          'SELECT booking_id, user_id, booking_type, booking_status, created_at FROM bookings ORDER BY created_at DESC LIMIT 5'
        );
        logSuccess('Recent bookings:');
        console.table(recentBookings);
      } else {
        logWarning('No bookings found in database');
      }
    } catch (error) {
      logError(`Error querying bookings: ${error.message}`);
    }
    
    // Check billings count
    try {
      const [billingCount] = await connection.query('SELECT COUNT(*) as count FROM billings');
      logInfo(`Total billings: ${billingCount[0].count}`);
      
      if (billingCount[0].count > 0) {
        const [recentBillings] = await connection.query(
          'SELECT billing_id, user_id, booking_id, transaction_status, created_at FROM billings ORDER BY created_at DESC LIMIT 5'
        );
        logSuccess('Recent billings:');
        console.table(recentBillings);
      } else {
        logWarning('No billings found in database');
      }
    } catch (error) {
      logError(`Error querying billings: ${error.message}`);
    }
    
    // Check for orphaned billings
    try {
      const [orphaned] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM billings b
        LEFT JOIN bookings bk ON b.booking_id = bk.booking_id
        WHERE bk.booking_id IS NULL
      `);
      
      if (orphaned[0].count > 0) {
        logWarning(`Found ${orphaned[0].count} orphaned billing(s) (no matching booking)`);
      }
    } catch (error) {
      // Ignore if foreign key constraint doesn't exist
    }
    
    await connection.end();
  } catch (error) {
    logError(`Error checking recent data: ${error.message}`);
  }
}

async function checkStatusDistribution() {
  logSection('5. Checking Status Distribution');
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    // Booking status distribution
    try {
      const [bookingStatuses] = await connection.query(`
        SELECT booking_status, COUNT(*) as count 
        FROM bookings 
        GROUP BY booking_status
      `);
      logInfo('Booking status distribution:');
      console.table(bookingStatuses);
    } catch (error) {
      logError(`Error checking booking statuses: ${error.message}`);
    }
    
    // Billing status distribution
    try {
      const [billingStatuses] = await connection.query(`
        SELECT transaction_status, COUNT(*) as count 
        FROM billings 
        GROUP BY transaction_status
      `);
      logInfo('Billing status distribution:');
      console.table(billingStatuses);
    } catch (error) {
      logError(`Error checking billing statuses: ${error.message}`);
    }
    
    await connection.end();
  } catch (error) {
    logError(`Error checking status distribution: ${error.message}`);
  }
}

async function testSampleInsert() {
  logSection('6. Testing Sample Insert');
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    const testBookingId = `TEST-${Date.now()}`;
    
    try {
      // Test booking insert
      const [bookingResult] = await connection.execute(`
        INSERT INTO bookings (
          booking_id, user_id, booking_type, reference_id,
          start_date, end_date, booking_status, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testBookingId,
        'test-user-debug',
        'Flight',
        'test-flight-001',
        new Date(),
        new Date(),
        'Pending',
        100.00
      ]);
      
      logSuccess(`Test booking inserted successfully! insertId: ${bookingResult.insertId}, affectedRows: ${bookingResult.affectedRows}`);
      
      // Clean up test data
      await connection.execute('DELETE FROM bookings WHERE booking_id = ?', [testBookingId]);
      logInfo('Test booking cleaned up');
      
    } catch (error) {
      logError(`Test booking insert failed: ${error.message}`);
      logError(`Error code: ${error.code}`);
      if (error.sqlState) {
        logError(`SQL State: ${error.sqlState}`);
      }
    }
    
    await connection.end();
  } catch (error) {
    logError(`Error testing sample insert: ${error.message}`);
  }
}

async function displayConfiguration() {
  logSection('Configuration');
  
  logInfo('MySQL Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${'*'.repeat(config.password.length)}`);
  console.log(`  Database: ${config.database}`);
  console.log('');
  logInfo('Expected service environment variables:');
  console.log('  MYSQL_HOST=mysql');
  console.log('  MYSQL_PORT=3306');
  console.log('  MYSQL_USER=root');
  console.log('  MYSQL_PASSWORD=Meera@2632');
  console.log('  MYSQL_DATABASE=kayak_db');
}

async function main() {
  console.log('\n');
  log('='.repeat(60), 'bright');
  log('  MySQL Save Debugging Script', 'bright');
  log('='.repeat(60), 'bright');
  console.log('');
  
  await displayConfiguration();
  
  // Run all checks
  const connected = await testConnection();
  
  if (!connected) {
    logError('\nCannot proceed - MySQL connection failed!');
    logInfo('\nNext steps:');
    logInfo('1. Check if MySQL container is running: docker ps | grep mysql');
    logInfo('2. Check MySQL logs: docker logs kayak-mysql');
    logInfo('3. Verify network connectivity');
    process.exit(1);
  }
  
  const { bookingsExists, billingsExists } = await checkDatabase();
  
  if (bookingsExists && billingsExists) {
    await checkTableSchemas();
    await checkRecentData();
    await checkStatusDistribution();
    await testSampleInsert();
  } else {
    logError('\nCannot proceed - Required tables are missing!');
    logInfo('\nNext steps:');
    logInfo('1. Run init script: docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql');
    logInfo('2. Or manually create tables using the SQL script');
  }
  
  logSection('Summary');
  logInfo('Debugging complete!');
  logInfo('\nIf issues persist, check:');
  logInfo('1. Application logs: docker logs kayak-booking-service && docker logs kayak-billing-service');
  logInfo('2. Transaction rollbacks (any error in transaction causes rollback)');
  logInfo('3. Foreign key constraints (billing requires booking to exist)');
  logInfo('4. Data validation (required fields, enum values, data types)');
  logInfo('\nSee scripts/debug-mysql-saves.md for detailed debugging guide');
  console.log('\n');
}

// Run the script
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

