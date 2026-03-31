-- Persist manual Card / UPI line items for daily accounting (JSON: {"cards":[{name,amount}], "upis":[{name,amount}]})
ALTER TABLE accounting_day_summary ADD COLUMN payment_details_json TEXT DEFAULT NULL;
