import { neon, Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set in environment variables");
}

export const sql = connectionString ? neon(connectionString) : null;
export const pool = connectionString ? new Pool({ connectionString }) : null;

export function databaseOrThrow() {
  if (!sql) {
    throw new Error("Database connection not configured");
  }
  return sql;
}
