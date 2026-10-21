'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 8081);
const DATABASE_URL = process.env.DATABASE_URL;
const BOSS_PIN = process.env.BOSS_PIN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
const sessions = new Map();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bossOk(req) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  const rec = sessions.get(token);
  if (!rec || rec.exp < Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  return true;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'spices-boss-hub', port: PORT });
});

app.post('/api/login', (req, res) => {
  const pin = String((req.body && req.body.pin) || '');
  if (!BOSS_PIN || pin !== BOSS_PIN) {
    return res.status(401).json({ error: 'Wrong PIN' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { exp: Date.now() + 12 * 60 * 60 * 1000 });
  res.json({ token });
});

app.post('/api/ingest', async (req, res) => {
  const b = req.body || {};
  const shopId = String(b.shopId || '').trim();
  const token = String(b.token || '').trim();
  if (!shopId || !token) {
    return res.status(400).json({ error: 'shopId and token required' });
  }
  const client = await pool.connect();
  try {
    const shop = await client.query('SELECT token_hash FROM shops WHERE shop_id = $1', [shopId]);
    if (!shop.rowCount || !bcrypt.compareSync(token, shop.rows[0].token_hash)) {
      return res.status(401).json({ error: 'Unknown shop' });
    }
    const companyName = String(b.companyName || shopId).trim() || shopId;
    const reportDate = String(b.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO daily_snapshots (
         shop_id, company_name, report_date, total_invoices, total_sales, total_tax, total_discount,
         total_items_sold, cash_sales, card_sales, upi_sales, mixed_sales, expenses,
         leftover_total, leftover_cash, leftover_card, leftover_upi, closing_cash, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
       ON CONFLICT (shop_id, company_name, report_date) DO UPDATE SET
         total_invoices = EXCLUDED.total_invoices,
         total_sales = EXCLUDED.total_sales,
         total_tax = EXCLUDED.total_tax,
         total_discount = EXCLUDED.total_discount,
         total_items_sold = EXCLUDED.total_items_sold,
         cash_sales = EXCLUDED.cash_sales,
         card_sales = EXCLUDED.card_sales,
         upi_sales = EXCLUDED.upi_sales,
         mixed_sales = EXCLUDED.mixed_sales,
         expenses = EXCLUDED.expenses,
         leftover_total = EXCLUDED.leftover_total,
         leftover_cash = EXCLUDED.leftover_cash,
         leftover_card = EXCLUDED.leftover_card,
         leftover_upi = EXCLUDED.leftover_upi,
         closing_cash = EXCLUDED.closing_cash,
         updated_at = NOW()`,
      [
        shopId, companyName, reportDate,
        num(b.totalInvoices), num(b.totalSales), num(b.totalTax), num(b.totalDiscount),
        num(b.totalItemsSold), num(b.cashSales), num(b.cardSales), num(b.upiSales),
        num(b.mixedSales), num(b.expenses),
        num(b.leftoverTotal), num(b.leftoverCash), num(b.leftoverCard), num(b.leftoverUpi),
        num(b.closingCash),
      ]
    );
    await client.query(
      'DELETE FROM stock_lines WHERE shop_id = $1 AND company_name = $2 AND report_date = $3',
      [shopId, companyName, reportDate]
    );
    const lines = Array.isArray(b.lowStock) ? b.lowStock.slice(0, 40) : [];
    for (const line of lines) {
      await client.query(
        `INSERT INTO stock_lines (shop_id, company_name, report_date, product_name, quantity, min_stock_level)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          shopId, companyName, reportDate,
          String(line.name || '').slice(0, 200) || 'Item',
          num(line.quantity), num(line.minStockLevel),
        ]
      );
    }
    await client.query(
      'DELETE FROM expense_lines WHERE shop_id = $1 AND company_name = $2 AND report_date = $3',
      [shopId, companyName, reportDate]
    );
    const expenseLines = Array.isArray(b.expenseLines) ? b.expenseLines.slice(0, 200) : [];
    for (const line of expenseLines) {
      await client.query(
        `INSERT INTO expense_lines (shop_id, company_name, report_date, item_name, amount, payment_method, account_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          shopId, companyName, reportDate,
          String(line.name || 'Expense').slice(0, 200),
          num(line.amount),
          String(line.paymentMethod || 'CASH').slice(0, 20),
          String(line.accountType || '').slice(0, 40),
        ]
      );
    }
    await client.query(
      'DELETE FROM employee_lines WHERE shop_id = $1 AND company_name = $2 AND report_date = $3',
      [shopId, companyName, reportDate]
    );
    const empLines = Array.isArray(b.employees) ? b.employees.slice(0, 80) : [];
    for (const line of empLines) {
      await client.query(
        `INSERT INTO employee_lines (
           shop_id, company_name, report_date, employee_name, employee_code, phone, designation,
           salary_month, salary, taken, net_pay, closing_balance
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          shopId, companyName, reportDate,
          String(line.name || '').slice(0, 200),
          String(line.code || '').slice(0, 50),
          String(line.phone || '').slice(0, 30),
          String(line.designation || '').slice(0, 100),
          String(line.salaryMonth || '').slice(0, 7),
          num(line.salary), num(line.taken), num(line.netPay), num(line.closingBalance),
        ]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    console.error('ingest', err.message);
    res.status(500).json({ error: 'ingest failed' });
  } finally {
    client.release();
  }
});

app.get('/api/shops', async (req, res) => {
  if (!bossOk(req)) return res.status(401).json({ error: 'Login required' });
  try {
    const r = await pool.query(
      `SELECT s.shop_id, s.display_name,
              (SELECT MAX(d.report_date)::text FROM daily_snapshots d WHERE d.shop_id = s.shop_id) AS last_date
       FROM shops s ORDER BY s.display_name`
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily', async (req, res) => {
  if (!bossOk(req)) return res.status(401).json({ error: 'Login required' });
  const shopId = String(req.query.shopId || '');
  const date = String(req.query.date || '').slice(0, 10);
  try {
    const r = await pool.query(
      `SELECT * FROM daily_snapshots WHERE shop_id = $1 AND report_date = $2 ORDER BY company_name`,
      [shopId, date]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/order', async (req, res) => {
  if (!bossOk(req)) return res.status(401).json({ error: 'Login required' });
  const shopId = String(req.query.shopId || '');
  const date = String(req.query.date || '').slice(0, 10);
  try {
    const r = await pool.query(
      `SELECT company_name, product_name, quantity, min_stock_level
       FROM stock_lines WHERE shop_id = $1 AND report_date = $2
       ORDER BY company_name, product_name`,
      [shopId, date]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monthly', async (req, res) => {
  if (!bossOk(req)) return res.status(401).json({ error: 'Login required' });
  const shopId = String(req.query.shopId || '');
  const year = Number(req.query.year) || new Date().getFullYear();
  try {
    const r = await pool.query(
      `SELECT EXTRACT(MONTH FROM report_date)::int AS month,
              SUM(total_sales)::float AS sales,
              SUM(total_invoices)::int AS invoices
       FROM daily_snapshots
       WHERE shop_id = $1 AND EXTRACT(YEAR FROM report_date) = $2
       GROUP BY 1 ORDER BY 1`,
      [shopId, year]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/day-pack', async (req, res) => {
  if (!bossOk(req)) return res.status(401).json({ error: 'Login required' });
  const shopId = String(req.query.shopId || '');
  const date = String(req.query.date || '').slice(0, 10);
  try {
    const [snap, expenses, employees, order] = await Promise.all([
      pool.query(
        `SELECT * FROM daily_snapshots WHERE shop_id = $1 AND report_date = $2 ORDER BY company_name`,
        [shopId, date]
      ),
      pool.query(
        `SELECT item_name, amount, payment_method, account_type
         FROM expense_lines WHERE shop_id = $1 AND report_date = $2 ORDER BY item_name`,
        [shopId, date]
      ),
      pool.query(
        `SELECT employee_name, employee_code, phone, designation, salary_month, salary, taken, net_pay, closing_balance
         FROM employee_lines WHERE shop_id = $1 AND report_date = $2 ORDER BY employee_name`,
        [shopId, date]
      ),
      pool.query(
        `SELECT product_name, quantity, min_stock_level
         FROM stock_lines WHERE shop_id = $1 AND report_date = $2 ORDER BY product_name`,
        [shopId, date]
      ),
    ]);
    res.json({
      snapshot: snap.rows[0] || null,
      expenses: expenses.rows,
      employees: employees.rows,
      order: order.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function migrate() {
  const alts = [
    'ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_total NUMERIC(12,2) NOT NULL DEFAULT 0',
    'ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_cash NUMERIC(12,2) NOT NULL DEFAULT 0',
    'ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_card NUMERIC(12,2) NOT NULL DEFAULT 0',
    'ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS leftover_upi NUMERIC(12,2) NOT NULL DEFAULT 0',
    'ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0',
  ];
  for (const sql of alts) {
    await pool.query(sql);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_lines (
      shop_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      report_date DATE NOT NULL,
      item_name TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_method TEXT,
      account_type TEXT
    )`);
  await pool.query(`
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
    )`);
}

migrate()
  .then(() => {
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`spices-boss-hub listening 127.0.0.1:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('migrate failed', err);
    process.exit(1);
  });
