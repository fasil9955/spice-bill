-- Database: boss_hub  (never online_shop)
CREATE TABLE IF NOT EXISTS shops (
  shop_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_snapshots (
  shop_id TEXT NOT NULL REFERENCES shops(shop_id),
  company_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_items_sold INTEGER NOT NULL DEFAULT 0,
  cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  upi_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  mixed_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shop_id, company_name, report_date)
);

CREATE TABLE IF NOT EXISTS stock_lines (
  shop_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  min_stock_level NUMERIC(14,4) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS stock_lines_lookup
  ON stock_lines (shop_id, company_name, report_date);

ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_total NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_cash NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_card NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_upi NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS expense_lines (
  shop_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  account_type TEXT
);

CREATE TABLE IF NOT EXISTS employee_lines (
  shop_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  employee_name TEXT NOT NULL,
  employee_code TEXT,
  phone TEXT,
  designation TEXT,
  salary_month TEXT,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  taken NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0
);
