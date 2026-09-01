import { neon, Pool } from "@neondatabase/serverless";

// Prefer unpooled URL for @neondatabase/serverless HTTP fetch queries
let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// Remove -pooler from host if present for HTTP fetch client to prevent timeout issues
if (connectionString) {
  connectionString = connectionString.replace("-pooler.", ".").replace("channel_binding=require&", "").replace("&channel_binding=require", "");
}

if (!connectionString) {
  console.warn("DATABASE_URL is not set in environment variables");
}

export const sql = connectionString ? neon(connectionString) : null;
export const pool = (process.env.DATABASE_URL || connectionString) ? new Pool({ connectionString: process.env.DATABASE_URL || connectionString }) : null;

export function databaseOrThrow() {
  if (!sql) {
    throw new Error("Database connection not configured");
  }
  return sql;
}
