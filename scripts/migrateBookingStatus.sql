-- Migration script to add PaymentFailed status to bookings table
-- Run this script if you have an existing database with bookings table

USE kayak_db;

-- Modify the booking_status ENUM to include PaymentFailed
-- Note: This requires dropping and recreating the column in MySQL
-- We'll use ALTER TABLE with MODIFY COLUMN

ALTER TABLE bookings 
MODIFY COLUMN booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'PaymentFailed') 
NOT NULL DEFAULT 'Pending';

-- Verify the change
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'kayak_db' 
  AND TABLE_NAME = 'bookings' 
  AND COLUMN_NAME = 'booking_status';

SELECT 'Migration completed successfully! PaymentFailed status added to bookings table.' AS message;

