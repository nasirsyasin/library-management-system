import { resolve } from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();

function getDatabaseUrl(): string {
  const url = process.env.CATALOG_DATABASE_URL || process.env.DATABASE_URL;
  if (url) return url;

  const { CATALOG_DB_HOST, CATALOG_DB_LOCAL_PORT, CATALOG_DB_NAME, CATALOG_DB_PASSWORD, CATALOG_DB_PORT, CATALOG_DB_USER } = process.env;
  if (process.env.NODE_ENV !== "production" && CATALOG_DB_HOST && CATALOG_DB_NAME && CATALOG_DB_PASSWORD && CATALOG_DB_USER) {
    const host = CATALOG_DB_HOST === "catalog-db" ? "127.0.0.1" : CATALOG_DB_HOST;
    const port = CATALOG_DB_LOCAL_PORT || "15432";
    return `postgresql://${encodeURIComponent(CATALOG_DB_USER)}:${encodeURIComponent(CATALOG_DB_PASSWORD)}@${host}:${port}/${encodeURIComponent(CATALOG_DB_NAME)}`;
  }

  const { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } = process.env;
  if (DB_HOST && DB_HOST !== "CATALOG_DB_HOST" && DB_NAME && DB_PASSWORD && DB_USER) {
    return `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT || "5432"}/${encodeURIComponent(DB_NAME)}`;
  }

  if (!CATALOG_DB_HOST || !CATALOG_DB_NAME || !CATALOG_DB_PASSWORD || !CATALOG_DB_USER) {
    throw new Error("Set DATABASE_URL or the catalog DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD variables");
  }
  return `postgresql://${encodeURIComponent(CATALOG_DB_USER)}:${encodeURIComponent(CATALOG_DB_PASSWORD)}@${CATALOG_DB_HOST}:${CATALOG_DB_PORT || "5432"}/${encodeURIComponent(CATALOG_DB_NAME)}`;
}

export const pool = new Pool({ connectionString: getDatabaseUrl() });
export const db = drizzle(pool, { schema });

export async function applyMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
}

export async function verifyDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
