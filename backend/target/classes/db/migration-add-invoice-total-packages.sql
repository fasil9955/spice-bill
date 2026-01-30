-- Add total_packages to invoices (B2B: one total for the whole bill). Run once.
ALTER TABLE invoices ADD COLUMN total_packages INT NULL;
