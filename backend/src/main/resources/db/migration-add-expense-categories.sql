-- Expense categories (Pigmi, Vegetable, Current bill, etc.) – user-created per company
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_company ON expense_categories(company_name);
