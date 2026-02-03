-- Closing balance at month end: positive = employer to give employee, negative = employee to give employer
ALTER TABLE employee_salary_clearances ADD COLUMN closing_balance DECIMAL(12,2) DEFAULT NULL;
