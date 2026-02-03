-- Add updated_at to courier_requests for "changed date"
ALTER TABLE courier_requests ADD COLUMN updated_at TIMESTAMP NULL;
