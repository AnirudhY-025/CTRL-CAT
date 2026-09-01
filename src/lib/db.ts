import { Pool, neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set in environment variables');
}

// Serverless SQL query helper (stateless HTTP queries - ultra fast)
export const sql = connectionString ? neon(connectionString) : null;

// Pool connection for transactions or long-lived connections
export const pool = connectionString ? new Pool({ connectionString }) : null;
