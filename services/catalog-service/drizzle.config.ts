import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const url =
  process.env.CATALOG_DATABASE_URL ||
  process.env.DATABASE_URL ||
  (process.env.CATALOG_DB_HOST &&
  process.env.CATALOG_DB_NAME &&
  process.env.CATALOG_DB_USER &&
  process.env.CATALOG_DB_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.CATALOG_DB_USER)}:${encodeURIComponent(process.env.CATALOG_DB_PASSWORD)}@${process.env.CATALOG_DB_HOST === "catalog-db" ? "127.0.0.1" : process.env.CATALOG_DB_HOST}:${process.env.CATALOG_DB_LOCAL_PORT || "15432"}/${encodeURIComponent(process.env.CATALOG_DB_NAME)}`
    : undefined);

if (!url) throw new Error("Set CATALOG_DATABASE_URL, DATABASE_URL, or CATALOG_DB_* variables in the project root .env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
