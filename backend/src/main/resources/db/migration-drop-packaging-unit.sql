-- Drop packaging_unit column; app uses only "unit" column.
-- Run this once against your database (e.g. mysql -u user -p yourdb < migration-drop-packaging-unit.sql).

ALTER TABLE products DROP COLUMN packaging_unit;
