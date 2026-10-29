import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const url =
  process.env.RESERVATION_DATABASE_URL ||
  process.env.DATABASE_URL ||
  (process.env.RESERVATION_DB_HOST &&
  process.env.RESERVATION_DB_NAME &&
  process.env.RESERVATION_DB_USER &&
  process.env.RESERVATION_DB_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.RESERVATION_DB_USER)}:${encodeURIComponent(process.env.RESERVATION_DB_PASSWORD)}@${process.env.RESERVATION_DB_HOST === "reservation-db" ? "127.0.0.1" : process.env.RESERVATION_DB_HOST}:${process.env.RESERVATION_DB_LOCAL_PORT || "15434"}/${encodeURIComponent(process.env.RESERVATION_DB_NAME)}`
    : undefined);

if (!url) throw new Error("Set RESERVATION_DATABASE_URL, DATABASE_URL, or RESERVATION_DB_* variables in the project root .env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
