-- Migration script to create B2B customers table and update invoices table
-- This is the RECOMMENDED approach for better database normalization

-- Step 1: Create B2B Customers table
CREATE TABLE IF NOT EXISTS b2b_customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    customer_name VARCHAR(200) NOT NULL, -- Contact person name
    gst_number VARCHAR(50) UNIQUE,
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(100),
    state_code VARCHAR(10), -- Extracted from GST number (first 2 digits)
    company_name_in_invoice VARCHAR(200), -- Company name as it appears in invoice
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_gst_number (gst_number),
    INDEX idx_company_name (company_name),
    INDEX idx_phone (phone)
);

-- Step 2: Add invoice_type and b2b_customer_id to invoices table
-- Remove the old customer fields if they exist (from previous migration)
ALTER TABLE invoices
ADD COLUMN invoice_type VARCHAR(10) DEFAULT 'B2C',
ADD COLUMN b2b_customer_id INT NULL,
ADD COLUMN eway_bill_number VARCHAR(50) NULL,
ADD FOREIGN KEY (b2b_customer_id) REFERENCES b2b_customers(customer_id) ON DELETE SET NULL,
ADD INDEX idx_invoice_type (invoice_type),
ADD INDEX idx_b2b_customer_id (b2b_customer_id);

-- Step 3: If old customer fields exist, migrate data to b2b_customers table
-- (Only run this if you already have data in the old fields)
-- This will create customer records from existing B2B invoices
INSERT INTO b2b_customers (company_name, customer_name, gst_number, address, phone, state_code, created_at)
SELECT DISTINCT
    COALESCE(customer_name, 'Unknown') as company_name,
    COALESCE(customer_name, 'Unknown') as customer_name,
    customer_gst as gst_number,
    customer_address as address,
    customer_phone as phone,
    SUBSTRING(customer_gst, 1, 2) as state_code,
    MIN(created_at) as created_at
FROM invoices
WHERE invoice_type = 'B2B' 
  AND customer_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM b2b_customers WHERE b2b_customers.gst_number = invoices.customer_gst
  )
GROUP BY customer_name, customer_gst, customer_address, customer_phone;

-- Step 4: Update invoices to reference b2b_customers
UPDATE invoices i
INNER JOIN b2b_customers c ON i.customer_gst = c.gst_number
SET i.b2b_customer_id = c.customer_id
WHERE i.invoice_type = 'B2B' AND i.customer_gst IS NOT NULL;

-- Step 5: Remove old customer fields from invoices table (after migration)
-- Uncomment these lines AFTER verifying the migration worked correctly:
-- ALTER TABLE invoices
-- DROP COLUMN IF EXISTS customer_name,
-- DROP COLUMN IF EXISTS customer_gst,
-- DROP COLUMN IF EXISTS customer_address,
-- DROP COLUMN IF EXISTS customer_phone;


