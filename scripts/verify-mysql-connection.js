#!/usr/bin/env node

/**
 * Quick script to verify which MySQL instance you're connected to
 * and show your booking/billing data
 */

const mysql = require('mysql2/promise');

const dockerMySQL = {
  host: 'localhost',
  port: 3307, // Docker MySQL port
  user: 'root',
  password: 'Meera@2632',
  database: 'kayak_db'
};

const localMySQL = {
  host: 'localhost',
  port: 3306, // Local MySQL port (default)
  user: 'root',
  password: 'Meera@2632', // Change if different
  database: 'kayak_db'
};

async function checkMySQL(config, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking: ${label}`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log('='.repeat(60));
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Get MySQL version and port
    const [version] = await connection.query('SELECT VERSION() as version');
    const [port] = await connection.query("SHOW VARIABLES LIKE 'port'");
    
    console.log(`✅ Connection successful!`);
    console.log(`   MySQL Version: ${version[0].version}`);
    console.log(`   Listening on port: ${port[0].Value}`);
    
    // Check if database exists
    try {
      await connection.query(`USE ${config.database}`);
      console.log(`✅ Database '${config.database}' exists`);
      
      // Check tables
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      if (tableNames.includes('bookings')) {
        const [bookingCount] = await connection.query('SELECT COUNT(*) as count FROM bookings');
        console.log(`✅ Table 'bookings' exists with ${bookingCount[0].count} records`);
        
        if (bookingCount[0].count > 0) {
          const [recent] = await connection.query(
            'SELECT booking_id, booking_type, booking_status, created_at FROM bookings ORDER BY created_at DESC LIMIT 3'
          );
          console.log(`   Recent bookings:`);
          recent.forEach(b => {
            console.log(`     - ${b.booking_id} (${b.booking_type}, ${b.booking_status}) - ${b.created_at}`);
          });
        }
      } else {
        console.log(`❌ Table 'bookings' does NOT exist`);
      }
      
      if (tableNames.includes('billings')) {
        const [billingCount] = await connection.query('SELECT COUNT(*) as count FROM billings');
        console.log(`✅ Table 'billings' exists with ${billingCount[0].count} records`);
        
        if (billingCount[0].count > 0) {
          const [recent] = await connection.query(
            'SELECT billing_id, booking_id, transaction_status, created_at FROM billings ORDER BY created_at DESC LIMIT 3'
          );
          console.log(`   Recent billings:`);
          recent.forEach(b => {
            console.log(`     - ${b.billing_id} (${b.transaction_status}) - ${b.created_at}`);
          });
        }
      } else {
        console.log(`❌ Table 'billings' does NOT exist`);
      }
      
    } catch (dbError) {
      console.log(`❌ Cannot access database '${config.database}': ${dbError.message}`);
    }
    
    await connection.end();
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`❌ Connection refused - MySQL not running on ${config.host}:${config.port}`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`❌ Access denied - Check username/password`);
    } else {
      console.log(`❌ Connection failed: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('\n🔍 MySQL Connection Checker');
  console.log('This script will check both Docker MySQL and Local MySQL');
  console.log('to help you identify where your data is stored.\n');
  
  const dockerConnected = await checkMySQL(dockerMySQL, '🐳 Docker MySQL (Port 3307) - THIS IS WHERE YOUR DATA IS');
  const localConnected = await checkMySQL(localMySQL, '💻 Local MySQL (Port 3306) - Your Windows MySQL');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  
  if (dockerConnected) {
    console.log('✅ Docker MySQL (port 3307) is accessible');
    console.log('   → This is where your services save data');
    console.log('   → Connect using: mysql -h localhost -P 3307 -u root -pMeera@2632 kayak_db');
  } else {
    console.log('❌ Docker MySQL (port 3307) is NOT accessible');
    console.log('   → Make sure Docker container is running: docker ps | grep mysql');
  }
  
  if (localConnected) {
    console.log('✅ Local MySQL (port 3306) is accessible');
    console.log('   → This is a different MySQL instance');
    console.log('   → Your data is NOT here!');
  } else {
    console.log('ℹ️  Local MySQL (port 3306) is not accessible or not running');
  }
  
  console.log('\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

