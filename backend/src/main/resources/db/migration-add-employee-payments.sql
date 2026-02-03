-- Payments we gave to the employee (salary payout). Run once.
CREATE TABLE IF NOT EXISTS employee_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  employee_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  remark VARCHAR(200),
  created_at DATETIME
);
