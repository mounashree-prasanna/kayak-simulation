-- MySQL Database Initialization Script for Kayak Project
-- This script creates the database and tables for bookings and billings

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS kayak_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE kayak_db;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type ENUM('Flight', 'Hotel', 'Car') NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    reference_ref VARCHAR(255),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'PaymentFailed') NOT NULL DEFAULT 'Pending',
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Existing indexes
    INDEX idx_user_booking (user_id, booking_type, booking_status),
    INDEX idx_booking_type_ref (booking_type, reference_id),
    INDEX idx_booking_status (booking_status),
    INDEX idx_created_at (created_at),
    -- Additional indexes for performance optimization
    INDEX idx_booking_id (booking_id),
    INDEX idx_user_id (user_id),
    INDEX idx_reference_id (reference_id),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_dates_range (start_date, end_date),
    INDEX idx_user_status (user_id, booking_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create billings table
CREATE TABLE IF NOT EXISTS billings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type VARCHAR(50) NOT NULL,
    booking_id VARCHAR(255) NOT NULL,
    booking_ref VARCHAR(255),
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount_paid DECIMAL(10, 2) NOT NULL CHECK (total_amount_paid >= 0),
    payment_method VARCHAR(100) NOT NULL,
    transaction_status ENUM('Success', 'Failed', 'Refunded', 'Pending') NOT NULL DEFAULT 'Pending',
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    invoice_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Existing indexes
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_status (transaction_status),
    INDEX idx_booking_billing (booking_id, booking_type),
    -- Additional indexes for performance optimization
    INDEX idx_billing_id (billing_id),
    INDEX idx_user_transaction (user_id, transaction_status),
    INDEX idx_date_status (transaction_date, transaction_status),
    INDEX idx_invoice_number (invoice_number),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show success message
SELECT 'Database and tables created successfully!' AS message;

