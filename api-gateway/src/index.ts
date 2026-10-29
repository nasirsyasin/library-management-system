import express from "express";
import { createServer } from "http";
import proxy from "express-http-proxy";
import dotenv from "dotenv";
import { requireApprovedIdentity, verifyServiceToken } from "./auth";
import { applyMigrations, pool } from "./db";
import { provisionAdministrator } from "./identity";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { createRealtimeServer } from "./realtime";

dotenv.config();
const app = express();
const server = createServer(app);
const io = createRealtimeServer(server);
app.disable("x-powered-by");

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin === "http://localhost:3000" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080" ||
    origin === "http://localhost:8082"
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || "http://catalog-service:8081";
const BORROW_URL = process.env.BORROW_SERVICE_URL || "http://borrow-service:8082";
const RESERVATION_URL = process.env.RESERVATION_SERVICE_URL || "http://reservation-service:8083";

app.get("/health", (_req, res) => res.json({ status: "ok", service: "api-gateway" }));
app.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready", service: "api-gateway" });
  } catch {
    res.status(503).json({ status: "not-ready", service: "api-gateway" });
  }
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);

// --- Routing to domain services ---
app.use("/api/catalog", requireApprovedIdentity, proxy(CATALOG_URL, { proxyReqPathResolver: (req) => `/api${req.url}` }));
app.use("/api/borrow", requireApprovedIdentity, proxy(BORROW_URL, { proxyReqPathResolver: (req) => `/api${req.url}` }));
app.use("/api/reservations", requireApprovedIdentity, proxy(RESERVATION_URL, { proxyReqPathResolver: (req) => `/api${req.url}` }));

app.post("/internal/book-returned", (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return res.sendStatus(401);

  const claims = verifyServiceToken(authorization.slice("Bearer ".length));
  if (!claims) return res.sendStatus(401);
  if (claims.service !== "reservation-service") return res.sendStatus(403);

  const { memberId, bookId, notificationId } = req.body as {
    memberId?: unknown;
    bookId?: unknown;
    notificationId?: unknown;
  };
  if (typeof memberId !== "string" || typeof bookId !== "string" || typeof notificationId !== "string") {
    return res.status(400).json({ error: "Invalid book-returned event" });
  }

  io.to(`member:${memberId}`).emit("book-returned", { bookId, notificationId });
  res.sendStatus(202);
});

const PORT = process.env.PORT || 8080;

async function start(): Promise<void> {
  const { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (
    !JWT_SECRET ||
    JWT_SECRET.length < 32 ||
    JWT_SECRET === "replace-with-a-long-random-secret" ||
    JWT_SECRET === "replace-this-with-a-random-secret-of-at-least-32-characters"
  ) {
    throw new Error("JWT_SECRET must be a unique, non-placeholder value of at least 32 characters");
  }
  if (Boolean(ADMIN_EMAIL) !== Boolean(ADMIN_PASSWORD)) {
    throw new Error("Configure both ADMIN_EMAIL and ADMIN_PASSWORD to provision the initial administrator");
  }

  let connected = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      connected = true;
      break;
    } catch {
      if (attempt === 29) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!connected) throw new Error("Identity database unavailable after 30 connection attempts");

  await applyMigrations();
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await provisionAdministrator(
      ADMIN_EMAIL,
      process.env.ADMIN_NAME || "Library Administrator",
      ADMIN_PASSWORD,
    );
  }
  server.listen(PORT, () => console.log(`api-gateway listening on port ${PORT}`));
}

start().catch(async (error: unknown) => {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? ` (error code: ${error.code})`
    : "";
  const detail = error instanceof Error
    ? error.message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED DATABASE URL]")
      .replace(/\b(password|secret|token)(\s*[=:]\s*)[^\s,;]+/gi, "$1$2[REDACTED]")
    : "Unknown startup error";
  console.error(`API Gateway startup failed${code}: ${detail}`);
  await pool.end();
  process.exitCode = 1;
});
