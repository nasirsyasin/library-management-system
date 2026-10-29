import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config();

const gatewayDbHost = process.env.GATEWAY_DB_HOST || process.env.IDENTITY_DB_HOST;
const gatewayDbName = process.env.GATEWAY_DB_NAME || process.env.IDENTITY_DB_NAME;
const gatewayDbUser = process.env.GATEWAY_DB_USER || process.env.IDENTITY_DB_USER;
const gatewayDbPassword = process.env.GATEWAY_DB_PASSWORD || process.env.IDENTITY_DB_PASSWORD;
const localDbHost = gatewayDbHost === "identity-db" ? "127.0.0.1" : gatewayDbHost;
const localDbPort = process.env.GATEWAY_DB_LOCAL_PORT || process.env.IDENTITY_DB_LOCAL_PORT || process.env.GATEWAY_DB_PORT || process.env.IDENTITY_DB_PORT || "5432";
const url = process.env.GATEWAY_DATABASE_URL ||
  (localDbHost && gatewayDbName && gatewayDbUser && gatewayDbPassword
    ? `postgresql://${encodeURIComponent(gatewayDbUser)}:${encodeURIComponent(gatewayDbPassword)}@${localDbHost}:${localDbPort}/${encodeURIComponent(gatewayDbName)}`
    : "postgresql://identity:identity@127.0.0.1:15435/identity");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
