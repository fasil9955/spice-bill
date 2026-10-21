# VPS Claude — deploy boss hub ONLY

You are on Ubuntu VPS `srv1300768` (Spice Bazar live). **Read this contract before any command.**

## Do not touch (live shop)

| Leave alone | Why |
|---|---|
| `/home/fasil/projects/online-shop` | Spice Bazar code |
| `/home/fasil/spices-backend.env` | Shop backend env |
| `/etc/nginx/sites-available/spicesbazar.org` | Live nginx site |
| PM2 `nextjs-app` | Next on **3000** |
| systemd `spices-backend` | JAR on **8080** |
| Postgres DB `online_shop` | Live shop data |
| Ports **80, 443, 3000, 8080, 5432, 22** as bound by existing apps | Already taken |

**Forbidden:** `pm2 delete/restart nextjs-app`, `systemctl restart spices-backend`, `DROP DATABASE online_shop`, overwrite `spicesbazar.org` nginx file, bind 3000 or 8080, `kill` Java on 8080.

## What to install (new everything)

- Folder: `/home/fasil/projects/spices-boss-hub` (clone spice-bill, copy `hub/` files here — or `git clone` then `cd hub`)
- Env: `/home/fasil/spices-boss-hub.env` (never spices-backend.env)
- Postgres DB **`boss_hub`**, user **`boss_hub`** (never `online_shop`)
- Listen **127.0.0.1:8081** only (this Node app serves API + phone UI — **no port 3001**, no extra Java, RAM is tight)
- systemd **`spices-boss-hub.service`** (from `hub/deploy/`)
- nginx **new file** `/etc/nginx/sites-available/billing.spicesbazar.org` then enable it. DNS A record `billing` → `72.61.224.95`. Then certbot **only** `-d billing.spicesbazar.org`.
- Do not run `mvn` / shop `npm run build`. `npm install --omit=dev` inside spices-boss-hub is enough.

## Suggested commands (after git pull of spice-bill)

```bash
# 1) code
sudo -u fasil mkdir -p /home/fasil/projects/spices-boss-hub
# copy spice-bill/hub/* into that folder (or clone repo and use hub/)

# 2) postgres — NEW db only
sudo -u postgres psql -c "CREATE USER boss_hub WITH PASSWORD 'GENERATE_STRONG';"
sudo -u postgres psql -c "CREATE DATABASE boss_hub OWNER boss_hub;"
sudo -u postgres psql -d boss_hub -f /home/fasil/projects/spices-boss-hub/schema.sql

# 3) env
# write /home/fasil/spices-boss-hub.env  PORT=8081 DATABASE_URL=... BOSS_PIN=... SESSION_SECRET=...
chmod 600 /home/fasil/spices-boss-hub.env

cd /home/fasil/projects/spices-boss-hub
npm install --omit=dev

set -a && source /home/fasil/spices-boss-hub.env && set +a
node scripts/bootstrap-shops.js
# SAVE printed shopId+token for each shop PC. Do not commit them.

# 4) systemd
sudo cp deploy/spices-boss-hub.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now spices-boss-hub

# 5) nginx NEW site file only
sudo cp deploy/nginx-billing.spicesbazar.org.conf /etc/nginx/sites-available/billing.spicesbazar.org
sudo ln -s /etc/nginx/sites-available/billing.spicesbazar.org /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d billing.spicesbazar.org
```

After: `curl -s http://127.0.0.1:8081/api/health` and `https://billing.spicesbazar.org/api/health`.

Confirm Spice Bazar still up: `curl -sI https://spicesbazar.org` and PM2 `nextjs-app` still online. If nginx -t fails, **do not reload**; revert only the new site file.

## Update hub only (day pack: expenses, leftover cash/card/UPI, employees)

Do **not** restart Spice Bazar. Pull spice-bill, copy `hub/` into the hub folder, restart **only** `spices-boss-hub`. Node migrate() adds leftover columns and expense/employee tables on start.

```bash
# find where spice-bill is cloned (adjust path if different)
# example if repo is at /home/fasil/projects/spice-bill:
cd /home/fasil/projects/spice-bill
sudo -u fasil git pull

# copy hub files over the running hub (overwrite code only, not .env)
sudo -u fasil rsync -a --exclude node_modules /home/fasil/projects/spice-bill/hub/ /home/fasil/projects/spices-boss-hub/

cd /home/fasil/projects/spices-boss-hub
sudo -u fasil npm install --omit=dev

sudo systemctl restart spices-boss-hub
sleep 2
curl -s http://127.0.0.1:8081/api/health
journalctl -u spices-boss-hub -n 40 --no-pager

# prove live shop still up
curl -sI https://spicesbazar.org | head -n 5
pm2 status
```

If git is only the hub folder (not full spice-bill), then:

```bash
cd /home/fasil/projects/spices-boss-hub
sudo -u fasil git pull
sudo -u fasil npm install --omit=dev
sudo systemctl restart spices-boss-hub
curl -s http://127.0.0.1:8081/api/health
```

Phone UI: https://billing.spicesbazar.org — after a shop clicks **Print Report** on Accounting & Day Close, the date shows total sales, bill count, all expenses, leftover cash/card/UPI, employees and salary.
