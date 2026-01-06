-- Migration Script: Link Products and Reports to Companies
-- Run this script to add company_name to products, daily_sales_report, and monthly_sales_summary

USE spices_billing_system;

-- Step 1: Add company_name to products table
ALTER TABLE products
ADD COLUMN company_name VARCHAR(200) NULL AFTER product_id;

-- Step 2: Update existing products with a default company (if any exist)
-- NOTE: You may need to manually update this based on your data
-- UPDATE products SET company_name = 'My Spices Shop' WHERE company_name IS NULL;

-- Step 3: Make company_name NOT NULL after updating existing data
-- ALTER TABLE products MODIFY COLUMN company_name VARCHAR(200) NOT NULL;

-- Step 4: Update unique constraints for products
ALTER TABLE products
DROP INDEX IF EXISTS idx_product_code,
DROP INDEX IF EXISTS idx_barcode;

ALTER TABLE products
ADD UNIQUE KEY unique_company_product_code (company_name, product_code),
ADD UNIQUE KEY unique_company_barcode (company_name, barcode),
ADD INDEX idx_company_name (company_name);

-- Step 5: Add company_name to daily_sales_report table
ALTER TABLE daily_sales_report
ADD COLUMN company_name VARCHAR(200) NULL AFTER report_id;

-- Step 6: Update existing daily reports with a default company (if any exist)
-- UPDATE daily_sales_report SET company_name = 'My Spices Shop' WHERE company_name IS NULL;

-- Step 7: Update unique constraint for daily_sales_report
ALTER TABLE daily_sales_report
DROP INDEX IF EXISTS idx_report_date;

ALTER TABLE daily_sales_report
ADD UNIQUE KEY unique_company_report_date (company_name, report_date),
ADD INDEX idx_company_name (company_name),
ADD INDEX idx_report_date (report_date);

-- Step 8: Add company_name to monthly_sales_summary table
ALTER TABLE monthly_sales_summary
ADD COLUMN company_name VARCHAR(200) NULL AFTER summary_id;

-- Step 9: Update existing monthly summaries with a default company (if any exist)
-- UPDATE monthly_sales_summary SET company_name = 'My Spices Shop' WHERE company_name IS NULL;

-- Step 10: Update unique constraint for monthly_sales_summary
ALTER TABLE monthly_sales_summary
DROP INDEX IF EXISTS unique_year_month;

ALTER TABLE monthly_sales_summary
ADD UNIQUE KEY unique_company_year_month (company_name, year, month),
ADD INDEX idx_company_name (company_name);

-- Verify the changes
DESCRIBE products;
DESCRIBE daily_sales_report;
DESCRIBE monthly_sales_summary;

-- Done! Products and reports are now linked to companies.
-- IMPORTANT: After running this migration, you need to:
-- 1. Update existing products with their company_name
-- 2. Update existing reports with their company_name
-- 3. Then make company_name NOT NULL in products table




