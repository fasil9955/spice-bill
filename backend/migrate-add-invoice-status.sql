-- Migration script to add status and cancellation fields to invoices table

ALTER TABLE invoices
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN cancellation_requested_at TIMESTAMP NULL,
ADD COLUMN cancellation_reason TEXT NULL;

-- Add index for status queries
CREATE INDEX idx_invoice_status ON invoices(status);


