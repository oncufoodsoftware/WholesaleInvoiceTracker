import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Add retry/error handling logic
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create database connection pool with minimal options to improve stability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Initialize Drizzle ORM with the connection pool
export const db = drizzle({ client: pool, schema });
