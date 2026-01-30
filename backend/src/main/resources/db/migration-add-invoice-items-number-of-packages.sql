-- Add number_of_packages to invoice_items (B2B: packages per line). Run once.
ALTER TABLE invoice_items ADD COLUMN number_of_packages INT NULL;
