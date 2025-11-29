const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// MySQL connection configuration
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true // Allow multiple SQL statements
};

const DB_NAME = process.env.MYSQL_DATABASE || 'kayak_db';

async function runSQLScript() {
  let connection;
  
  try {
    console.log('🔍 Connecting to MySQL server...');
    console.log(`   Host: ${mysqlConfig.host}`);
    console.log(`   Port: ${mysqlConfig.port}`);
    console.log(`   User: ${mysqlConfig.user}\n`);

    // Connect without specifying database first
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL server successfully!\n');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'initMySQL.sql');
    console.log(`📖 Reading SQL script: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ SQL script loaded\n');

    // Execute SQL script
    console.log('🚀 Executing SQL script...\n');
    await connection.query(sql);
    
    console.log('✅ Database and tables created successfully!\n');

    // Verify tables were created
    await connection.query(`USE ${DB_NAME}`);
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log('📊 Created tables:');
    tableNames.forEach(table => {
      console.log(`   ✓ ${table}`);
    });

    console.log('\n✅ MySQL initialization completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error initializing MySQL database:');
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure MySQL server is running');
      console.error('   2. Check if MySQL is running on the specified host and port');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check your MySQL username and password');
      console.error('   2. Make sure the user has CREATE DATABASE privileges');
    } else {
      console.error('💡 Check the error message above for details');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed.');
    }
  }
}

// Run the script
console.log('='.repeat(50));
console.log('MySQL Database Initialization Script');
console.log('='.repeat(50));
console.log('');

// Check if password is provided
if (!process.env.MYSQL_PASSWORD && !mysqlConfig.password) {
  console.log('⚠️  Warning: No MySQL password provided.');
  console.log('   Set MYSQL_PASSWORD environment variable or update the script.\n');
}

runSQLScript()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  });

