-- Add closing cash and closing GPay total to accounting_day_summary (yesterday's values become today's opening)
ALTER TABLE accounting_day_summary ADD COLUMN closing_cash DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE accounting_day_summary ADD COLUMN closing_gpay_total DECIMAL(12,2) DEFAULT NULL;
