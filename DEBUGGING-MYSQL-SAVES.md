# How to Debug: Why Booking and Billing Data Not Getting Saved to MySQL

## ⚠️ IMPORTANT: Check the Right MySQL Instance!

**Your services save data to Docker MySQL (port 3307), NOT your local MySQL (port 3306)!**

- ✅ **Docker MySQL (correct):** `localhost:3307` - This is where your data is
- ❌ **Local MySQL (wrong):** `localhost:3306` - Different MySQL instance on your Windows machine

**Quick check:** Run `cd scripts && npm run verify-mysql` to see which MySQL has your data!

---

I've created comprehensive debugging tools to help you identify why your booking and billing data isn't being saved to MySQL.

## Quick Start

### Option 1: Run the Automated Debugging Script (Easiest)
```bash
cd scripts
npm run debug-mysql
```

This script will automatically check:
- ✅ MySQL connection
- ✅ Database and table existence
- ✅ Table schemas
- ✅ Recent data
- ✅ Status distributions
- ✅ Test sample inserts

### Option 2: Run SQL Check Script
```bash
# From host machine
mysql -h localhost -P 3307 -u root -pMeera@2632 < scripts/check-mysql-data.sql

# OR from Docker container
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 kayak_db < scripts/check-mysql-data.sql
```

### Option 3: Check Service Logs
```bash
# Check booking service
docker logs kayak-booking-service --tail 100

# Check billing service
docker logs kayak-billing-service --tail 100

# Follow logs in real-time
docker logs -f kayak-booking-service
docker logs -f kayak-billing-service
```

## What to Look For

### 1. **Connection Issues**
Look for errors like:
- `MySQL connection error: ...`
- `ECONNREFUSED`
- `ER_ACCESS_DENIED_ERROR`

**Fix:** Verify MySQL container is running and environment variables are correct.

### 2. **Missing Tables**
Look for errors like:
- `Table 'kayak_db.bookings' doesn't exist`
- `Table 'kayak_db.billings' doesn't exist`

**Fix:** Run initialization script:
```bash
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql
```

### 3. **Transaction Rollbacks**
Look for:
- `Transaction error:` in logs
- Data appearing to save but not persisting
- `affectedRows: 0` in console logs

**Common causes:**
- Errors inside transaction callbacks (any error = automatic rollback)
- Foreign key constraint violations
- Data validation failures

### 4. **Foreign Key Violations**
Look for errors like:
- `Cannot add or update a child row: a foreign key constraint fails`
- Billing insert fails but booking insert succeeds

**Fix:** Ensure booking is created BEFORE billing (booking_id must exist).

### 5. **Data Validation Errors**
Look for:
- Enum value errors (`booking_status` must be: Pending, Confirmed, Cancelled, PaymentFailed)
- Type mismatches (dates, decimals)
- NULL in required fields

## Files Created

1. **`scripts/debug-mysql-saves.js`** - Automated debugging script
2. **`scripts/debug-mysql-saves.md`** - Comprehensive debugging guide with detailed explanations
3. **`scripts/check-mysql-data.sql`** - SQL queries to manually check database state
4. **`scripts/README-debugging.md`** - Quick reference guide

## Step-by-Step Debugging Process

### Step 1: Verify MySQL is Running
```bash
docker ps | grep mysql
docker logs kayak-mysql | tail -20
```

### Step 2: Run Debugging Script
```bash
cd scripts
npm run debug-mysql
```

This will show you:
- ✅/✗ Connection status
- ✅/✗ Database existence
- ✅/✗ Table existence
- Table structures
- Recent data counts
- Sample insert test

### Step 3: Check Application Logs
Look for these key log messages:
- `[Booking Service] MySQL Connected: ...`
- `[Billing Service] MySQL Connected: ...`
- `[Booking Repository] Created booking record: ...`
- `[Billing Repository] Created billing record: ...`

If you see errors instead, note them down.

### Step 4: Check Database Directly
```sql
-- Connect to MySQL
mysql -h localhost -P 3307 -u root -pMeera@2632

-- Check data
USE kayak_db;
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM billings;
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;
SELECT * FROM billings ORDER BY created_at DESC LIMIT 5;
```

### Step 5: Test Manual Insert
Try inserting test data directly to verify the database works:
```sql
-- Test booking insert
INSERT INTO bookings (
  booking_id, user_id, booking_type, reference_id,
  start_date, end_date, booking_status, total_price
) VALUES (
  'TEST-001', 'test-user', 'Flight', 'flight-001',
  NOW(), NOW(), 'Pending', 100.00
);

-- Verify it was inserted
SELECT * FROM bookings WHERE booking_id = 'TEST-001';

-- Clean up
DELETE FROM bookings WHERE booking_id = 'TEST-001';
```

## Common Issues and Solutions

### Issue: Services Can't Connect to MySQL

**Check:**
1. MySQL container is running: `docker ps | grep mysql`
2. Environment variables match docker-compose.yml
3. Network connectivity: Services must be on `kayak-network`

**Fix:**
```bash
# Restart MySQL container
docker restart kayak-mysql

# Check environment variables
docker exec kayak-booking-service env | grep MYSQL
docker exec kayak-billing-service env | grep MYSQL
```

### Issue: Tables Don't Exist

**Fix:**
```bash
# Run initialization script
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql

# Verify tables were created
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 -e "USE kayak_db; SHOW TABLES;"
```

### Issue: Data Not Persisting (Transaction Rollback)

**Check:**
1. Look for errors in transaction callbacks
2. Check `affectedRows` - should be 1 for successful insert
3. Verify no errors are being caught and swallowed

**Add Debugging:**
The repositories already log insertId and affectedRows. If you see `affectedRows: 0`, the insert failed silently.

### Issue: Foreign Key Constraint Violation

**Problem:** Billing requires booking to exist first.

**Solution:** Ensure booking is created before billing. The code should already handle this, but check:
1. Booking is inserted successfully
2. Booking ID matches in billing insert
3. No foreign key constraint errors in logs

## Enhanced Logging

The repositories already have console.log statements that show:
- `[Booking Repository] Created booking record: booking_id=XXX, insertId=YYY, affectedRows=1`
- `[Billing Repository] Created billing record: billing_id=XXX, insertId=YYY, affectedRows=1`

If you see `affectedRows=0`, the insert didn't work.

## Need More Help?

1. Run the automated debugging script: `npm run debug-mysql` in the scripts directory
2. Check the detailed guide: `scripts/debug-mysql-saves.md`
3. Review service logs for specific error messages
4. Test direct database access to verify MySQL is working

## Next Steps After Debugging

Once you identify the issue:

1. **Connection issues** → Fix environment variables or network
2. **Missing tables** → Run initialization script
3. **Transaction rollbacks** → Fix the error causing rollback
4. **Foreign key violations** → Ensure data is created in correct order
5. **Validation errors** → Fix data format/type issues

The debugging tools will help you identify which of these is the problem!

