-- Migration script to add B2B customer details and e-way bill fields to invoices table

ALTER TABLE invoices
ADD COLUMN customer_name VARCHAR(200) NULL,
ADD COLUMN customer_gst VARCHAR(50) NULL,
ADD COLUMN customer_address VARCHAR(500) NULL,
ADD COLUMN customer_phone VARCHAR(20) NULL,
ADD COLUMN invoice_type VARCHAR(10) NULL DEFAULT 'B2C',
ADD COLUMN eway_bill_number VARCHAR(50) NULL;

-- Add index for faster lookup of B2B invoices
CREATE INDEX idx_invoice_type ON invoices (invoice_type);


