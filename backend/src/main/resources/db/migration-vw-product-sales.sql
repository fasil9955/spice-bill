-- Fix vw_product_sales: drop invalid view and recreate using correct table/column names.
-- Error 1356 is usually: wrong table/column names, or definer lacks rights.
-- This view uses SQL SECURITY INVOKER so it runs with the caller's rights.

USE spices_billing_system;

-- Drop the broken view if it exists
DROP VIEW IF EXISTS vw_product_sales;

-- Recreate: product sales (one row per invoice line) with correct schema
-- Tables: invoices, invoice_items, users (cashier -> company_name)
-- SQL SECURITY INVOKER must come before VIEW in MySQL
CREATE SQL SECURITY INVOKER VIEW vw_product_sales AS
SELECT
    u.company_name,
    ii.product_id,
    ii.product_name,
    ii.barcode,
    ii.unit,
    i.invoice_id,
    i.invoice_number,
    i.invoice_type,
    DATE(i.created_at) AS sale_date,
    i.created_at,
    ii.quantity,
    ii.unit_price,
    ii.total_price,
    ii.discount_amount
FROM invoice_items ii
JOIN invoices i ON i.invoice_id = ii.invoice_id
JOIN users u ON u.user_id = i.cashier_id
WHERE i.status = 'ACTIVE';
