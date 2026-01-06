-- Migration script to remove packaging_type and packaging_size columns
-- Run this script to update your database schema

-- Remove packaging columns from products table
ALTER TABLE products 
DROP COLUMN IF EXISTS packaging_type,
DROP COLUMN IF EXISTS packaging_size,
DROP COLUMN IF EXISTS packaging_unit;

-- Remove packaging columns from invoice_items table
ALTER TABLE invoice_items 
DROP COLUMN IF EXISTS packaging_type,
DROP COLUMN IF EXISTS packaging_size;

-- Remove index on packaging_type if it exists
DROP INDEX IF EXISTS idx_packaging_type ON products;



