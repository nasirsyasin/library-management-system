import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config();

const url = process.env.GATEWAY_DATABASE_URL ||
  (process.env.GATEWAY_DB_HOST && process.env.GATEWAY_DB_NAME && process.env.GATEWAY_DB_USER && process.env.GATEWAY_DB_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.GATEWAY_DB_USER)}:${encodeURIComponent(process.env.GATEWAY_DB_PASSWORD)}@${process.env.GATEWAY_DB_HOST}:${process.env.GATEWAY_DB_PORT || "5432"}/${encodeURIComponent(process.env.GATEWAY_DB_NAME)}`
    : "postgresql://identity:identity@127.0.0.1:15435/identity");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
