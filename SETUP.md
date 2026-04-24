# CubiqHost — Setup Guide

## Prerequisites
- Node.js 20+
- MySQL 8.0+ or MariaDB 10.6+
- pnpm (`npm install -g pnpm`)
- Pterodactyl Panel already running at `https://panel.cubiqhost.in`

---

## 1. Database Setup

```bash
mysql -u root -p < scripts/mysql_schema.sql
```

This creates the `cubiqhost` database with all tables and seed data.

---

## 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description |
|---|---|
| `MYSQL_*` | MySQL connection details |
| `PTERODACTYL_PANEL_URL` | Your panel URL |
| `PTERODACTYL_API_KEY` | Application API key from panel → API Credentials |
| `PTERODACTYL_DEFAULT_NODE_ID` | Node ID from panel → Nodes |
| `PTERODACTYL_DEFAULT_EGG_ID` | Egg ID from panel → Nests |
| `PTERODACTYL_DEFAULT_LOCATION_ID` | Location ID from panel → Locations |
| `SESSION_SECRET` | 64+ char random string |
| `SSO_SECRET` | 64+ char random string — **NEVER change after users are created** |
| `CRON_SECRET` | Secret for cron endpoint authentication |
| `RESEND_API_KEY` | Get from resend.com |

> **Important**: Generate real secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 3. Pterodactyl Setup

### Application API Key
1. Panel → Admin → Application API → Create API Key
2. Give permissions: Users (read/write), Nodes (read), Servers (read/write), Nests (read)
3. Paste the key into `PTERODACTYL_API_KEY`

### Software Egg IDs
Update `scripts/mysql_schema.sql` `software_options` insert with your actual egg IDs:
- Check Panel → Admin → Nests → [your nest] → Eggs
- The `egg_id` column = the egg's numeric ID in the panel

### Node Allocations
The panel needs available (unassigned) port allocations for server creation to work:
- Panel → Admin → Nodes → [your node] → Allocation

---

## 4. Install & Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

---

## 5. Admin Access

Login with: `support.cubiqhost@gmail.com` / `wwadaar123`
**Change the password immediately after first login.**

Admin panel: http://localhost:3000/admin

---

## 6. Cron Job (Vercel)

The `vercel.json` configures the cron job to run at the top of every hour.
Set `CRON_SECRET` in Vercel environment variables to secure the endpoint.

For self-hosted, add a system cron:
```cron
0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron
```

---

## 7. SSO (Panel Auto-Login)

SSO works by:
1. Generating a deterministic password per user: `HMAC-SHA256(userId, SSO_SECRET)`
2. Storing this password when creating the Pterodactyl user at registration
3. When user clicks "Open Panel", an auto-submit form POSTs credentials to the panel

⚠️ **Never change `SSO_SECRET`** once users are registered — it will invalidate all their panel passwords.

---

## 8. Production Deployment

```bash
pnpm build
pnpm start
```

Or deploy to Vercel:
```bash
vercel --prod
```

Add all `.env.local` variables to Vercel → Project → Settings → Environment Variables.
