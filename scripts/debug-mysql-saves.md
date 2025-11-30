# Debugging Guide: Why Booking and Billing Data Not Getting Saved to MySQL

## Quick Checklist

### 1. Check MySQL Connection
- [ ] Is MySQL container running?
- [ ] Can the services connect to MySQL?
- [ ] Are environment variables set correctly?

### 2. Check Database and Tables
- [ ] Does `kayak_db` database exist?
- [ ] Do `bookings` and `billings` tables exist?
- [ ] Are table schemas correct?

### 3. Check Application Logs
- [ ] Look for MySQL connection errors
- [ ] Look for transaction rollback errors
- [ ] Look for SQL execution errors
- [ ] Check for foreign key constraint violations

### 4. Check Transaction Behavior
- [ ] Are transactions being committed?
- [ ] Are there silent failures in transactions?
- [ ] Are errors being caught and swallowed?

### 5. Check Data Validation
- [ ] Are required fields being provided?
- [ ] Do data types match the schema?
- [ ] Are foreign key references valid?

---

## Step-by-Step Debugging

### Step 1: Verify MySQL is Running

```bash
# Check if MySQL container is running
docker ps | grep mysql

# Check MySQL logs
docker logs kayak-mysql

# Test MySQL connection from host
mysql -h localhost -P 3307 -u root -pMeera@2632 -e "SHOW DATABASES;"
```

### Step 2: Check Database and Tables

```sql
-- Connect to MySQL
mysql -h localhost -P 3307 -u root -pMeera@2632

-- Check if database exists
SHOW DATABASES;

-- Use the database
USE kayak_db;

-- Check if tables exist
SHOW TABLES;

-- Check bookings table structure
DESCRIBE bookings;

-- Check billings table structure
DESCRIBE billings;

-- Check recent bookings
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;

-- Check recent billings
SELECT * FROM billings ORDER BY created_at DESC LIMIT 10;
```

### Step 3: Check Application Logs

```bash
# Check booking service logs
docker logs kayak-booking-service

# Check billing service logs
docker logs kayak-billing-service

# Follow logs in real-time
docker logs -f kayak-booking-service
docker logs -f kayak-billing-service
```

### Step 4: Verify Environment Variables

```bash
# Check booking service environment
docker exec kayak-booking-service env | grep MYSQL

# Check billing service environment
docker exec kayak-billing-service env | grep MYSQL

# Expected values:
# MYSQL_HOST=mysql
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=Meera@2632
# MYSQL_DATABASE=kayak_db
```

### Step 5: Test Direct Database Connection from Services

```bash
# Test connection from booking service container
docker exec kayak-booking-service sh -c "ping -c 1 mysql"

# Test MySQL connection (if mysql client installed)
docker exec kayak-booking-service sh -c "mysql -h mysql -u root -pMeera@2632 -e 'SELECT 1;'"
```

---

## Common Issues and Solutions

### Issue 1: MySQL Connection Failed
**Symptoms:**
- Logs show: `MySQL connection error: ...`
- Services fail to start

**Solutions:**
1. Verify MySQL container is healthy: `docker ps`
2. Check network connectivity: Services must be on `kayak-network`
3. Verify environment variables match docker-compose.yml
4. Check MySQL is listening: `docker logs kayak-mysql | grep "ready for connections"`

### Issue 2: Tables Don't Exist
**Symptoms:**
- Logs show: `Table 'kayak_db.bookings' doesn't exist`
- INSERT queries fail

**Solutions:**
1. Check if init script ran: `docker logs kayak-mysql | grep "init.sql"`
2. Manually run init script:
   ```bash
   docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql
   ```
3. Or connect and create tables manually using the SQL script

### Issue 3: Foreign Key Constraint Violation
**Symptoms:**
- Billing insert fails with foreign key error
- Booking must exist before billing can be created

**Solutions:**
1. Ensure booking is created first
2. Check booking_id exists: `SELECT booking_id FROM bookings WHERE booking_id = 'YOUR_ID';`
3. Verify foreign key is correct in billing insert

### Issue 4: Transaction Rollback
**Symptoms:**
- Data appears to save but doesn't persist
- No errors shown but no data in database

**Solutions:**
1. Check for errors inside transaction - any error causes rollback
2. Add more logging inside transaction callbacks
3. Check `affectedRows` after INSERT - should be 1
4. Verify transaction is being committed (not rolled back)

### Issue 5: Silent Failures
**Symptoms:**
- No errors in logs
- Data not saved

**Solutions:**
1. Enable detailed logging in repository methods
2. Check console.log outputs for insertId and affectedRows
3. Add try-catch with explicit error logging
4. Verify error handlers aren't swallowing errors

### Issue 6: Data Type Mismatches
**Symptoms:**
- SQL errors about invalid values
- Enum value errors

**Solutions:**
1. Check enum values match: `Pending`, `Confirmed`, etc.
2. Verify date formats are correct (DATETIME)
3. Check DECIMAL values are valid numbers
4. Verify VARCHAR lengths don't exceed limits

---

## Enhanced Logging

Add these debug statements to your code:

### In BookingRepository.create():
```javascript
console.log('[DEBUG] BookingRepository.create called with:', JSON.stringify(bookingData, null, 2));
console.log('[DEBUG] SQL:', sql);
console.log('[DEBUG] Params:', params);
```

### In BillingRepository.create():
```javascript
console.log('[DEBUG] BillingRepository.create called with:', JSON.stringify(billingData, null, 2));
console.log('[DEBUG] SQL:', sql);
console.log('[DEBUG] Params:', params);
```

### In transaction callbacks:
```javascript
try {
  // ... transaction code ...
  console.log('[DEBUG] Transaction about to commit');
  await connection.commit();
  console.log('[DEBUG] Transaction committed successfully');
} catch (error) {
  console.error('[DEBUG] Transaction error:', error);
  console.error('[DEBUG] Error stack:', error.stack);
  throw error;
}
```

---

## Direct Database Testing

### Test Booking Insert:
```sql
INSERT INTO bookings (
  booking_id, user_id, user_ref, booking_type, reference_id, 
  reference_ref, start_date, end_date, booking_status, total_price
) VALUES (
  'TEST-BOOKING-001',
  'test-user-001',
  NULL,
  'Flight',
  'flight-001',
  NULL,
  '2024-01-01 10:00:00',
  '2024-01-01 12:00:00',
  'Pending',
  150.00
);
```

### Test Billing Insert (requires booking first):
```sql
-- First, ensure booking exists
INSERT INTO bookings (...) VALUES (...);

-- Then insert billing
INSERT INTO billings (
  billing_id, user_id, user_ref, booking_type, booking_id,
  booking_ref, transaction_date, total_amount_paid, payment_method,
  transaction_status, invoice_number, invoice_details
) VALUES (
  'TEST-BILLING-001',
  'test-user-001',
  NULL,
  'Flight',
  'TEST-BOOKING-001', -- Must match existing booking_id
  NULL,
  NOW(),
  150.00,
  'Credit Card',
  'Success',
  'INV-001',
  '{"test": "data"}'
);
```

---

## Monitoring Queries

Run these queries to monitor data:

```sql
-- Count bookings by status
SELECT booking_status, COUNT(*) as count 
FROM bookings 
GROUP BY booking_status;

-- Count billings by status
SELECT transaction_status, COUNT(*) as count 
FROM billings 
GROUP BY transaction_status;

-- Check recent activity
SELECT 
  'booking' as type,
  booking_id as id,
  booking_status as status,
  created_at
FROM bookings
UNION ALL
SELECT 
  'billing' as type,
  billing_id as id,
  transaction_status as status,
  created_at
FROM billings
ORDER BY created_at DESC
LIMIT 20;

-- Check for orphaned billings (billing without booking)
SELECT b.* 
FROM billings b
LEFT JOIN bookings bk ON b.booking_id = bk.booking_id
WHERE bk.booking_id IS NULL;
```

---

## Next Steps

1. Run the debugging script: `node scripts/debug-mysql-saves.js`
2. Check application logs for errors
3. Verify MySQL connection and tables exist
4. Test with direct SQL inserts
5. Add enhanced logging to identify the issue

