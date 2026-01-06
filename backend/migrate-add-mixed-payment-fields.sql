-- Migration script to add mixed payment breakdown fields to invoices table

ALTER TABLE invoices
ADD COLUMN cash_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN card_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN upi_amount DECIMAL(10, 2) DEFAULT 0;

-- For existing invoices with MIXED payment, we'll need to update them manually or leave as 0
-- The frontend will handle splitting for new invoices


