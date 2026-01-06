-- Migration Script: Add Company Fields to Users Table
-- Run this script to add GST, FSSAI License, Address, and Phone Number fields

USE spices_billing_system;

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN gst_number VARCHAR(50) NULL AFTER password,
ADD COLUMN fssai_license VARCHAR(50) NULL AFTER gst_number,
ADD COLUMN address TEXT NULL AFTER fssai_license,
ADD COLUMN phone_number VARCHAR(20) NULL AFTER address;

-- Verify the changes
DESCRIBE users;

-- Done! New fields have been added to the users table.

