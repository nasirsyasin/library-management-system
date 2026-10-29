import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const url =
  process.env.BORROW_DATABASE_URL ||
  process.env.DATABASE_URL ||
  (process.env.BORROW_DB_HOST &&
  process.env.BORROW_DB_NAME &&
  process.env.BORROW_DB_USER &&
  process.env.BORROW_DB_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.BORROW_DB_USER)}:${encodeURIComponent(process.env.BORROW_DB_PASSWORD)}@${process.env.BORROW_DB_HOST === "borrow-db" ? "127.0.0.1" : process.env.BORROW_DB_HOST}:${process.env.BORROW_DB_LOCAL_PORT || "15433"}/${encodeURIComponent(process.env.BORROW_DB_NAME)}`
    : undefined);

if (!url) throw new Error("Set BORROW_DATABASE_URL, DATABASE_URL, or BORROW_DB_* variables in the project root .env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
