-- =====================================================
-- Spices Shop Billing System - Complete Database Schema
-- =====================================================
-- This is a complete schema with all features included
-- No migrations needed - use this for fresh installations

-- Create Database
CREATE DATABASE IF NOT EXISTS spices_billing_system;
USE spices_billing_system;

-- =====================================================
-- 1. USERS TABLE (Admin and Cashier - Only 2 users per company)
-- =====================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    role ENUM('ADMIN', 'CASHIER') NOT NULL,
    password VARCHAR(255) NOT NULL, -- Stores hashed password
    gst_number VARCHAR(50),
    fssai_license VARCHAR(50),
    address TEXT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_role (company_name, role),
    INDEX idx_company_name (company_name),
    INDEX idx_role (role)
);

-- =====================================================
-- 2. CATEGORIES TABLE (Optional: for organizing spices)
-- =====================================================
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category_name (category_name)
);

-- =====================================================
-- 3. PRODUCTS TABLE (Spices with Barcode - Handles Packed and Loose)
-- =====================================================
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL, -- Link to company
    product_name VARCHAR(200) NOT NULL, -- Spice name (e.g., Cardamom, Turmeric)
    category_id INT, -- Optional category
    product_code VARCHAR(50) NOT NULL,
    barcode VARCHAR(100) NOT NULL, -- EAN-13 or custom barcode
    packaging_type ENUM('PACKED', 'LOOSE') NOT NULL, -- PACKED or LOOSE
    packaging_size DECIMAL(10, 3) NULL, -- For PACKED: 0.250 (250gm), 0.500 (500gm), 1.0 (1kg), 2.0 (2kg). NULL for LOOSE
    packaging_unit VARCHAR(20) DEFAULT 'kg', -- kg, gm, etc.
    purchase_price DECIMAL(10, 2) NOT NULL, -- Cost price per unit
    selling_price_per_unit DECIMAL(10, 2) NOT NULL, -- For PACKED: price per pack. For LOOSE: price per kg/gm
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Current stock quantity
    min_stock_level DECIMAL(10, 2) DEFAULT 0, -- Alert when stock goes below this
    gst_percentage DECIMAL(5, 2) DEFAULT 0.00, -- GST percentage for the product
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    UNIQUE KEY unique_company_product_code (company_name, product_code),
    UNIQUE KEY unique_company_barcode (company_name, barcode),
    INDEX idx_company_name (company_name),
    INDEX idx_product_code (product_code),
    INDEX idx_barcode (barcode),
    INDEX idx_packaging_type (packaging_type),
    INDEX idx_product_name (product_name),
    INDEX idx_category_id (category_id)
);

-- =====================================================
-- 4. B2B CUSTOMERS TABLE (For B2B invoice customers)
-- =====================================================
CREATE TABLE b2b_customers (
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

-- =====================================================
-- 5. INVOICES/BILLS TABLE
-- =====================================================
CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-YYYY-MMDD-XXXX
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0, -- GST/VAT if applicable
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('CASH', 'CARD', 'UPI', 'MIXED') DEFAULT 'CASH',
    -- Mixed payment breakdown (only used when paymentMethod is MIXED)
    cash_amount DECIMAL(10, 2) DEFAULT 0,
    card_amount DECIMAL(10, 2) DEFAULT 0,
    upi_amount DECIMAL(10, 2) DEFAULT 0,
    cashier_id INT NOT NULL, -- User who created the invoice
    -- Invoice status and cancellation
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLATION_REQUESTED, CANCELLED
    cancellation_requested_at TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    -- B2B Invoice Fields
    invoice_type VARCHAR(10) DEFAULT 'B2C', -- B2B or B2C
    b2b_customer_id INT NULL, -- Foreign key to b2b_customers (for B2B invoices)
    eway_bill_number VARCHAR(50) NULL, -- E-way bill number (different for each invoice)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (b2b_customer_id) REFERENCES b2b_customers(customer_id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_cashier_id (cashier_id),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_type (invoice_type),
    INDEX idx_b2b_customer_id (b2b_customer_id),
    INDEX idx_invoice_status (status)
);

-- =====================================================
-- 6. INVOICE ITEMS TABLE (Products in each invoice)
-- =====================================================
CREATE TABLE invoice_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL, -- Store snapshot of product name
    barcode VARCHAR(100), -- Store snapshot of barcode
    quantity DECIMAL(10, 2) NOT NULL, -- For PACKED: number of packs. For LOOSE: weight (kg/gm)
    unit_price DECIMAL(10, 2) NOT NULL, -- Price at time of sale
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL, -- (quantity * unit_price) - discount
    -- B2B Invoice Item Fields
    hsn_code VARCHAR(20) NULL, -- HSN code for B2B invoices (default: 090411 for spices)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_product_id (product_id)
);

-- =====================================================
-- 7. DAILY SALES REPORT TABLE (For daily reporting)
-- =====================================================
CREATE TABLE daily_sales_report (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL, -- Link to company
    report_date DATE NOT NULL,
    total_invoices INT DEFAULT 0,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_discount DECIMAL(10, 2) DEFAULT 0,
    total_items_sold INT DEFAULT 0,
    cash_sales DECIMAL(10, 2) DEFAULT 0,
    card_sales DECIMAL(10, 2) DEFAULT 0,
    upi_sales DECIMAL(10, 2) DEFAULT 0,
    mixed_sales DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_report_date (company_name, report_date),
    INDEX idx_company_name (company_name),
    INDEX idx_report_date (report_date)
);

-- =====================================================
-- 8. MONTHLY SALES SUMMARY TABLE (For quick reporting)
-- =====================================================
CREATE TABLE monthly_sales_summary (
    summary_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL, -- Link to company
    year INT NOT NULL,
    month INT NOT NULL, -- 1-12
    total_invoices INT DEFAULT 0,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_tax DECIMAL(10, 2) DEFAULT 0,
    total_discount DECIMAL(10, 2) DEFAULT 0,
    total_items_sold INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_company_year_month (company_name, year, month),
    INDEX idx_company_name (company_name),
    INDEX idx_year_month (year, month)
);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View: Current Stock Status
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

-- View: Daily Sales Summary
CREATE VIEW vw_daily_sales AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_invoices,
    SUM(total_amount) as total_sales,
    SUM(tax_amount) as total_tax,
    SUM(discount_amount) as total_discount,
    SUM(total_amount - tax_amount - discount_amount) as net_sales
FROM invoices
WHERE status = 'ACTIVE'
GROUP BY DATE(created_at);

-- View: Product Sales Summary
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
WHERE i.status = 'ACTIVE'
GROUP BY p.product_id, p.product_code, p.product_name, p.packaging_type, p.packaging_size;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure: Update stock after sale
DELIMITER //
CREATE PROCEDURE sp_update_stock_after_sale(
    IN p_product_id INT,
    IN p_quantity DECIMAL(10, 2)
)
BEGIN
    -- Update stock quantity in products table
    UPDATE products 
    SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id;
END //
DELIMITER ;

-- Procedure: Generate Invoice Number
DELIMITER //
CREATE PROCEDURE sp_generate_invoice_number(OUT invoice_number VARCHAR(50))
BEGIN
    DECLARE prefix VARCHAR(10) DEFAULT 'INV';
    DECLARE date_part VARCHAR(10);
    DECLARE seq_num INT;
    
    SET date_part = DATE_FORMAT(NOW(), '%Y-%m%d');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)), 0) + 1
    INTO seq_num
    FROM invoices
    WHERE DATE(created_at) = CURDATE();
    
    SET invoice_number = CONCAT(prefix, '-', date_part, '-', LPAD(seq_num, 4, '0'));
END //
DELIMITER ;
