import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a standard PostgreSQL connection pool.
// ssl: { rejectUnauthorized: false } allows self-signed certs on Render/cloud providers.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Log unexpected errors on idle pool clients so they don't go unnoticed.
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Initialize Drizzle ORM with the connection pool
export const db = drizzle({ client: pool, schema });
