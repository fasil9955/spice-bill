-- Add unit column to invoice_items so each line item stores product unit (pcs, kg, etc.).
-- Run once against your database.

ALTER TABLE invoice_items ADD COLUMN unit varchar(20) DEFAULT NULL AFTER hsn_code;
