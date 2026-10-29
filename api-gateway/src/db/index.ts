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

  const { GATEWAY_DB_HOST, GATEWAY_DB_NAME, GATEWAY_DB_PASSWORD, GATEWAY_DB_PORT, GATEWAY_DB_USER } = process.env;
  if (GATEWAY_DB_HOST && GATEWAY_DB_NAME && GATEWAY_DB_PASSWORD && GATEWAY_DB_USER) {
    const localPort = process.env.GATEWAY_DB_LOCAL_PORT;
    const host = localPort && GATEWAY_DB_HOST === "identity-db" ? "127.0.0.1" : GATEWAY_DB_HOST;
    const port = localPort || GATEWAY_DB_PORT || "5432";
    return `postgresql://${encodeURIComponent(GATEWAY_DB_USER)}:${encodeURIComponent(GATEWAY_DB_PASSWORD)}@${host}:${port}/${encodeURIComponent(GATEWAY_DB_NAME)}`;
  }

  throw new Error("Set GATEWAY_DATABASE_URL or GATEWAY_DB_HOST, GATEWAY_DB_NAME, GATEWAY_DB_USER, and GATEWAY_DB_PASSWORD");
}

export const pool = new Pool({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 3000 });
export const db = drizzle(pool, { schema });

export async function applyMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(__dirname, "../../drizzle") });
}
