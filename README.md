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
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| Auth | Passport.js (session-based) |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (free tier available)

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

Render is the easiest way to deploy this application with zero infrastructure management.

**Steps:**

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) and create a free account.
3. Click **"New +"** → **"Web Service"** → connect your GitHub repository.
4. Render detects the `render.yaml` file and pre-fills the settings automatically.
5. Set the following environment variables in the Render dashboard:
   - `DATABASE_URL` – your Neon PostgreSQL connection string
   - `SESSION_SECRET` – a long random string (Render can auto-generate this)
   - `OPENAI_API_KEY` – optional, for AI features
6. Click **"Create Web Service"**.

Your app will be live at `https://<your-service-name>.onrender.com` within a few minutes.

> **Note:** The free tier spins down after 15 minutes of inactivity. Upgrade to the **Starter** plan for always-on availability.

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
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (Neon or any Postgres) |
| `SESSION_SECRET` | ✅ Yes | Secret key for session encryption (min. 32 characters) |
| `NODE_ENV` | ✅ Yes | Set to `production` for live deployments |
| `PORT` | No | Port to listen on (defaults to `5000`) |
| `OPENAI_API_KEY` | No | Enables AI-powered financial tips |

---

## Database Setup

The application uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. To create the database schema:

```bash
npm run db:push
```

This command applies the schema defined in `shared/schema.ts` directly to your database.

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
