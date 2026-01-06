-- =====================================================
-- Migration Script: Remove BaseProduct Table
-- Run this script to update your existing database
-- =====================================================

USE spices_billing_system;

-- Step 1: Add product_name and category_id to products table
ALTER TABLE products 
ADD COLUMN product_name VARCHAR(200) AFTER product_id,
ADD COLUMN category_id INT AFTER product_name;

-- Step 2: Copy product names from base_products to products
UPDATE products p
INNER JOIN base_products bp ON p.base_product_id = bp.base_product_id
SET p.product_name = bp.product_name,
    p.category_id = bp.category_id;

-- Step 3: Make product_name NOT NULL (after data is copied)
ALTER TABLE products 
MODIFY COLUMN product_name VARCHAR(200) NOT NULL;

-- Step 4: Add indexes
ALTER TABLE products 
ADD INDEX idx_product_name (product_name),
ADD INDEX idx_category_id (category_id);

-- Step 5: Add foreign key for category
ALTER TABLE products 
ADD FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL;

-- Step 6: Drop old foreign key and column
ALTER TABLE products 
DROP FOREIGN KEY products_ibfk_1,  -- Adjust name if different
DROP COLUMN base_product_id,
DROP INDEX idx_base_product_id;

-- Step 7: Drop base_products table
DROP TABLE IF EXISTS base_products;

-- Step 8: Recreate views (drop and recreate)
DROP VIEW IF EXISTS vw_current_stock;
CREATE VIEW vw_current_stock AS
SELECT 
    p.product_id,
    p.product_code,
    p.product_name,
    p.barcode,
    c.category_name,
    p.packaging_type,
    p.packaging_size,
    p.packaging_unit,
    p.purchase_price,
    p.selling_price_per_unit,
    p.quantity as current_stock,
    p.min_stock_level,
    CASE 
        WHEN p.quantity <= p.min_stock_level THEN 'LOW'
        WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.is_active = TRUE;

DROP VIEW IF EXISTS vw_product_sales;
CREATE VIEW vw_product_sales AS
SELECT 
    p.product_id,
    p.product_code,
    p.product_name,
    p.packaging_type,
    p.packaging_size,
    SUM(ii.quantity) as total_quantity_sold,
    SUM(ii.total_price) as total_revenue,
    AVG(ii.unit_price) as avg_selling_price,
    COUNT(DISTINCT ii.invoice_id) as times_sold
FROM products p
INNER JOIN invoice_items ii ON p.product_id = ii.product_id
INNER JOIN invoices i ON ii.invoice_id = i.invoice_id
GROUP BY p.product_id, p.product_code, p.product_name, p.packaging_type, p.packaging_size;

-- Done! BaseProduct table has been removed and simplified.

