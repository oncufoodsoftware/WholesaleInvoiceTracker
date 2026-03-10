# Wholesale Invoice Tracker

A comprehensive finance management system for multi-branch wholesale businesses. Manage invoices, track supplier payments, analyze financial performance, and control access with role-based permissions.

## Features

- **Invoice Management** – Create and track standard, credit, and cash invoices with file attachments
- **Supplier Management** – Maintain supplier profiles, track outstanding balances across branches
- **Financial Analytics** – Real-time dashboards, revenue forecasts, and cash flow tracking
- **Multi-Branch Support** – Manage finances across multiple business locations
- **Role-Based Access Control** – Admin, Branch Manager, and Accountant roles with customizable permissions
- **Payment Tracking** – Invoice payments, bulk supplier payments, and direct debits
- **Risk Analytics** – Supplier payment delay analysis with automated risk scoring
- **AI Integration** – Financial tips powered by OpenAI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (any provider – Render, Neon, Railway, local) |
| ORM | Drizzle ORM |
| Auth | Passport.js (session-based) |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- A PostgreSQL database (any provider: [Neon](https://neon.tech), [Render](https://render.com), [Railway](https://railway.app), or local)

### 1. Clone the repository

```bash
git clone https://github.com/oncufoodsoftware/WholesaleInvoiceTracker.git
cd WholesaleInvoiceTracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
SESSION_SECRET=your-super-secret-session-key-at-least-32-chars
NODE_ENV=development

# Optional – enables AI financial tips
OPENAI_API_KEY=sk-...
```

### 4. Set up the database

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

The application will be available at **http://localhost:5000**.

---

## Deploying Online

### Option 1 – Render (Recommended, Free Tier Available)

Render is the easiest way to deploy this application with zero infrastructure management. The `render.yaml` in this repository provisions **both the web service and a PostgreSQL database** automatically — no manual database setup required.

**Steps:**

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) and create a free account.
3. Click **"New +"** → **"Blueprint"** → connect your GitHub repository.
4. Render detects the `render.yaml` file and pre-fills **all** settings, including creating a managed PostgreSQL database and wiring `DATABASE_URL` automatically.
5. On the first deploy the build command runs `npm run db:migrate` to create all database tables automatically — no manual schema setup needed.
6. Optionally set the following in the Render dashboard:
   - `OPENAI_API_KEY` – optional, enables AI-powered financial tips
7. Click **"Apply"**.

Your app will be live at `https://<your-service-name>.onrender.com` within a few minutes. `SESSION_SECRET` is auto-generated and `DATABASE_URL` is automatically connected to the provisioned database — no manual secrets needed.

> **Note:** The free tier spins down after 15 minutes of inactivity. Upgrade to the **Starter** plan for always-on availability.
> The free PostgreSQL plan on Render expires after 90 days. Upgrade to a paid plan before then to retain your data.

---

### Migrating from Replit/Neon to Render

When you first deploy to Render, it provisions a **fresh, empty PostgreSQL database**. The build step runs `npm run db:migrate` automatically to create all tables — but your existing data (from Replit) is not copied yet.

You have two options:

#### Option A — Keep using your existing Neon database (easiest, zero downtime)

Your Replit app connects to a Neon cloud database hosted at `*.neon.tech`. This database is reachable from anywhere on the internet, so you can point your Render deployment at it without any data transfer.

1. In Replit, copy the value of the `DATABASE_URL` environment variable  
   (format: `postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/dbname?sslmode=require`)

2. In the [Render dashboard](https://dashboard.render.com), open your service → **Environment** tab.

3. Add an environment variable:
   ```
   DATABASE_URL = <paste your Neon connection string>
   ```
   This overrides the auto-generated value from `render.yaml`, pointing Render at your existing database.

4. Redeploy — your Render app will now use the same Neon database and all your data will be immediately available.

> **Tip:** You can delete the `databases:` block from `render.yaml` once you've switched to Neon, so Render stops provisioning an unused managed database.

---

#### Option B — Migrate data to a Render-managed PostgreSQL

Use this option if you want all your data hosted on Render's own infrastructure (e.g. for lower latency or to stop relying on Neon).

**Prerequisites:**  
- `psql` / `pg_dump` installed locally (comes with [PostgreSQL](https://www.postgresql.org/download/))
- Your Neon `DATABASE_URL` (from Replit environment variables)
- Your Render `DATABASE_URL` (from the Render dashboard → your database → **Connection** tab → **External Connection String**)

**Steps:**

```bash
# 1. Dump all data from your Neon (Replit) database to a local file
pg_dump "$NEON_DATABASE_URL" \
  --no-owner --no-acl --format=custom \
  --file=neon-backup.dump

# 2. Restore the dump into your Render PostgreSQL database
pg_restore "$RENDER_DATABASE_URL" \
  --no-owner --no-acl \
  --clean --if-exists \
  neon-backup.dump
```

Replace `$NEON_DATABASE_URL` and `$RENDER_DATABASE_URL` with the actual connection strings.

> **Note:** Both URLs must include credentials and the `sslmode=require` parameter.  
> Example: `postgresql://user:password@hostname:5432/dbname?sslmode=require`

After a successful restore, update the `DATABASE_URL` environment variable in the Render dashboard to point at the Render-managed database (it should already be set correctly if you used `render.yaml`).

---

### Option 2 – Railway

1. Install the Railway CLI: `npm install -g @railway/cli`
2. Log in: `railway login`
3. Create a new project: `railway init`
4. Set environment variables: `railway variables set DATABASE_URL=... SESSION_SECRET=...`
5. Deploy: `railway up`

Your app will be assigned a public URL automatically.

---

### Option 3 – Fly.io

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Log in: `fly auth login`
3. Launch the app (uses the `Dockerfile`): `fly launch`
4. Set secrets:
   ```bash
   fly secrets set DATABASE_URL="postgresql://..." SESSION_SECRET="..."
   ```
5. Deploy: `fly deploy`

---

### Option 4 – Docker (Self-Hosted)

Build and run the Docker image on any server (VPS, AWS EC2, DigitalOcean Droplet, etc.).

```bash
# Build the image
docker build -t wholesale-invoice-tracker .

# Run the container
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="your-secret" \
  -e NODE_ENV="production" \
  wholesale-invoice-tracker
```

The application will be available on port 5000.

To use a different port, set the `PORT` environment variable:

```bash
docker run -d \
  -p 80:3000 \
  -e PORT=3000 \
  -e DATABASE_URL="..." \
  -e SESSION_SECRET="..." \
  -e NODE_ENV="production" \
  wholesale-invoice-tracker
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string. Auto-set by Render when using `render.yaml`; set manually for other platforms |
| `SESSION_SECRET` | ✅ Yes | Secret key for session encryption (min. 32 characters). Auto-generated by Render |
| `NODE_ENV` | ✅ Yes | Set to `production` for live deployments |
| `PORT` | No | Port to listen on (defaults to `5000`) |
| `OPENAI_API_KEY` | No | Enables AI-powered financial tips |

---

## Database Setup

The application uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. Two commands are available:

```bash
# Apply versioned migration files (recommended for production and CI)
npm run db:migrate

# Push schema directly from code (recommended for local development)
npm run db:push
```

`npm run db:migrate` applies the SQL files in the `migrations/` folder in order — it is idempotent and safe to run on every deploy.  
`npm run db:push` computes a schema diff and applies it directly without migration files — convenient during development.

> On Render, `npm run db:migrate` runs automatically as part of every build (`render.yaml` → `buildCommand`), so tables are always up to date when the service starts.

---

## Build for Production

```bash
npm run build
npm run start
```

- `npm run build` compiles the React frontend (output: `dist/public/`) and bundles the Express server (output: `dist/index.js`)
- `npm run start` runs the production server

---

## CI/CD

This repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automatically:

- Runs TypeScript type checks (`npm run check`) on every push and pull request
- Builds the project to catch any build errors
- Validates the Docker image builds successfully

To enable the CI workflow, ensure your repository has the `DATABASE_URL` secret configured (or the workflow uses a placeholder for build-only validation).
