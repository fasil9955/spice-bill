-- Migration script to add GST percentage column to products table
-- Run this script to update your database schema

-- Add GST percentage column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 0.00;

-- Update existing products to have 0% GST if NULL
UPDATE products SET gst_percentage = 0.00 WHERE gst_percentage IS NULL;

