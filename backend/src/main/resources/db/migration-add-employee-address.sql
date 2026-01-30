-- Add address column to employees table.
-- Run once against your database.

ALTER TABLE employees ADD COLUMN address varchar(500) DEFAULT NULL AFTER designation;
