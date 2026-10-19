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
app.use(express.json({ limit: '200kb' }));
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
         total_items_sold, cash_sales, card_sales, upi_sales, mixed_sales, expenses, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
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
         updated_at = NOW()`,
      [
        shopId, companyName, reportDate,
        num(b.totalInvoices), num(b.totalSales), num(b.totalTax), num(b.totalDiscount),
        num(b.totalItemsSold), num(b.cashSales), num(b.cardSales), num(b.upiSales),
        num(b.mixedSales), num(b.expenses),
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

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`spices-boss-hub listening 127.0.0.1:${PORT}`);
});
