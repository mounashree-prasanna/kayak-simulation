-- Quick MySQL Data Check Script
-- Run this to check if bookings and billings are being saved
-- 
-- Usage:
--   mysql -h localhost -P 3307 -u root -pMeera@2632 < scripts/check-mysql-data.sql
--   OR
--   docker exec -i kayak-mysql mysql -uroot -pMeera@2632 kayak_db < scripts/check-mysql-data.sql

USE kayak_db;

-- Show database info
SELECT '=== DATABASE CHECK ===' AS '';
SELECT DATABASE() AS current_database;

-- Check if tables exist
SELECT '=== TABLE EXISTENCE CHECK ===' AS '';
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'kayak_db'
    AND TABLE_NAME IN ('bookings', 'billings');

-- Count records
SELECT '=== RECORD COUNTS ===' AS '';
SELECT 
    'bookings' AS table_name,
    COUNT(*) AS total_records
FROM bookings
UNION ALL
SELECT 
    'billings' AS table_name,
    COUNT(*) AS total_records
FROM billings;

-- Show booking status distribution
SELECT '=== BOOKING STATUS DISTRIBUTION ===' AS '';
SELECT 
    booking_status,
    COUNT(*) AS count,
    MIN(created_at) AS first_created,
    MAX(created_at) AS last_created
FROM bookings
GROUP BY booking_status
ORDER BY count DESC;

-- Show billing status distribution
SELECT '=== BILLING STATUS DISTRIBUTION ===' AS '';
SELECT 
    transaction_status,
    COUNT(*) AS count,
    MIN(created_at) AS first_created,
    MAX(created_at) AS last_created
FROM billings
GROUP BY transaction_status
ORDER BY count DESC;

-- Recent bookings (last 10)
SELECT '=== RECENT BOOKINGS (Last 10) ===' AS '';
SELECT 
    id,
    booking_id,
    user_id,
    booking_type,
    booking_status,
    total_price,
    created_at,
    updated_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;

-- Recent billings (last 10)
SELECT '=== RECENT BILLINGS (Last 10) ===' AS '';
SELECT 
    id,
    billing_id,
    user_id,
    booking_id,
    transaction_status,
    total_amount_paid,
    created_at,
    updated_at
FROM billings
ORDER BY created_at DESC
LIMIT 10;

-- Check for orphaned billings (billings without matching bookings)
SELECT '=== ORPHANED BILLINGS CHECK ===' AS '';
SELECT 
    b.id,
    b.billing_id,
    b.booking_id,
    b.transaction_status,
    b.created_at
FROM billings b
LEFT JOIN bookings bk ON b.booking_id = bk.booking_id
WHERE bk.booking_id IS NULL;

-- Check bookings without billings
SELECT '=== BOOKINGS WITHOUT BILLINGS ===' AS '';
SELECT 
    bk.id,
    bk.booking_id,
    bk.booking_status,
    bk.total_price,
    bk.created_at
FROM bookings bk
LEFT JOIN billings b ON bk.booking_id = b.booking_id
WHERE b.booking_id IS NULL
    AND bk.booking_status IN ('Pending', 'Confirmed')
ORDER BY bk.created_at DESC;

-- Show table structures
SELECT '=== BOOKINGS TABLE STRUCTURE ===' AS '';
DESCRIBE bookings;

SELECT '=== BILLINGS TABLE STRUCTURE ===' AS '';
DESCRIBE billings;

-- Check foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' AS '';
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'kayak_db'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

