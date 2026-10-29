import { resolve } from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config();

function getDatabaseUrl(): string {
  if (process.env.GATEWAY_DATABASE_URL) return process.env.GATEWAY_DATABASE_URL;

  const host = process.env.GATEWAY_DB_HOST || process.env.IDENTITY_DB_HOST;
  const name = process.env.GATEWAY_DB_NAME || process.env.IDENTITY_DB_NAME;
  const user = process.env.GATEWAY_DB_USER || process.env.IDENTITY_DB_USER;
  const password = process.env.GATEWAY_DB_PASSWORD || process.env.IDENTITY_DB_PASSWORD;
  if (host && name && password && user) {
    const localPort = process.env.GATEWAY_DB_LOCAL_PORT || process.env.IDENTITY_DB_LOCAL_PORT;
    const dbHost = localPort && host === "identity-db" ? "127.0.0.1" : host;
    const port = localPort || process.env.GATEWAY_DB_PORT || process.env.IDENTITY_DB_PORT || "5432";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${dbHost}:${port}/${encodeURIComponent(name)}`;
  }

  throw new Error("Set GATEWAY_DATABASE_URL or GATEWAY_DB_*/IDENTITY_DB_* connection variables");
}

export const pool = new Pool({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 3000 });
export const db = drizzle(pool, { schema });

export async function applyMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(__dirname, "../../drizzle") });
}
