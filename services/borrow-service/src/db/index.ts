import { resolve } from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();

function getDatabaseUrl(): string {
  const url = process.env.BORROW_DATABASE_URL || process.env.DATABASE_URL;
  if (url) return url;

  const { BORROW_DB_HOST, BORROW_DB_LOCAL_PORT, BORROW_DB_NAME, BORROW_DB_PASSWORD, BORROW_DB_PORT, BORROW_DB_USER } = process.env;
  if (process.env.NODE_ENV !== "production" && BORROW_DB_HOST && BORROW_DB_NAME && BORROW_DB_PASSWORD && BORROW_DB_USER) {
    const host = BORROW_DB_HOST === "borrow-db" ? "127.0.0.1" : BORROW_DB_HOST;
    const port = BORROW_DB_LOCAL_PORT || "15433";
    return `postgresql://${encodeURIComponent(BORROW_DB_USER)}:${encodeURIComponent(BORROW_DB_PASSWORD)}@${host}:${port}/${encodeURIComponent(BORROW_DB_NAME)}`;
  }

  const { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } = process.env;
  if (DB_HOST && DB_HOST !== "BORROW_DB_HOST" && DB_NAME && DB_PASSWORD && DB_USER) {
    return `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT || "5432"}/${encodeURIComponent(DB_NAME)}`;
  }

  if (!BORROW_DB_HOST || !BORROW_DB_NAME || !BORROW_DB_PASSWORD || !BORROW_DB_USER) {
    throw new Error("Set DATABASE_URL or the borrow DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD variables");
  }
  return `postgresql://${encodeURIComponent(BORROW_DB_USER)}:${encodeURIComponent(BORROW_DB_PASSWORD)}@${BORROW_DB_HOST}:${BORROW_DB_PORT || "5432"}/${encodeURIComponent(BORROW_DB_NAME)}`;
}

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle(pool, { schema });

export async function applyMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
}

export async function verifyDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
