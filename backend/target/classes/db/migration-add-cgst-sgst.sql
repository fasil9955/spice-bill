-- Add CGST/SGST columns (selling price is GST-inclusive; GST % from category; CGST = SGST = half of GST).
-- Run once against your database.

ALTER TABLE invoice_items ADD COLUMN gst_percentage decimal(5,2) DEFAULT NULL AFTER unit;
ALTER TABLE invoice_items ADD COLUMN cgst_amount decimal(10,2) DEFAULT NULL AFTER gst_percentage;
ALTER TABLE invoice_items ADD COLUMN sgst_amount decimal(10,2) DEFAULT NULL AFTER cgst_amount;

ALTER TABLE invoices ADD COLUMN cgst_amount decimal(10,2) DEFAULT NULL AFTER tax_amount;
ALTER TABLE invoices ADD COLUMN sgst_amount decimal(10,2) DEFAULT NULL AFTER cgst_amount;
