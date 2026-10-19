'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const names = String(process.env.BOOTSTRAP_SHOPS || 'Shop 1,Shop 2,Shop 3,Shop 4,Shop 5,Shop 6')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const pool = new Pool({ connectionString: DATABASE_URL });

(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
  const out = [];
  for (const name of names) {
    const shopId = crypto.randomUUID();
    const token = crypto.randomBytes(24).toString('hex');
    const hash = bcrypt.hashSync(token, 10);
    await pool.query(
      'INSERT INTO shops (shop_id, display_name, token_hash) VALUES ($1,$2,$3)',
      [shopId, name, hash]
    );
    out.push({ name, shopId, token });
  }
  console.log('SAVE THESE TOKENS OFF THE SERVER (shop application.properties). Shown once:');
  console.log(JSON.stringify(out, null, 2));
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
