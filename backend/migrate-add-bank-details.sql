-- Migration script to add bank account details to users table

ALTER TABLE users
ADD COLUMN bank_name VARCHAR(200) NULL,
ADD COLUMN account_number VARCHAR(50) NULL,
ADD COLUMN ifsc_code VARCHAR(20) NULL,
ADD COLUMN branch_name VARCHAR(200) NULL;


